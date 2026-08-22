-- ============================================================
-- Jobak — companies, and the links that get a candidate past the aggregator
-- Run this in your Supabase SQL editor, after schema.sql.
-- ============================================================
--
-- An aggregator's apply button is a redirect through the aggregator. What a
-- candidate wants is the employer: their site, their LinkedIn page, and the
-- careers page where the rest of their openings live — including the ones that
-- never got posted to a board at all.
--
-- Those three facts belong in their own table rather than on `jobs`, because
-- they change on a completely different clock. A company's website changes
-- roughly never; its open roles change hourly. Storing them per job would mean
-- re-resolving the same company on every collection run, and resolving one
-- company costs up to three outbound requests — see services/scraper/api/enrich.ts.
--
-- So: the collector inserts jobs as before, then enriches the companies it has
-- not seen recently, and every future job at that company is already answered.

CREATE TABLE IF NOT EXISTS companies (
  id            SERIAL PRIMARY KEY,

  -- As the source spelled it, for display.
  name          TEXT NOT NULL,

  -- The lookup key: lower-cased, punctuation and legal suffixes stripped, so
  -- "Instabug", "instabug" and "Instabug, Inc." are one company rather than
  -- three. Written by `company_key()` below — never by hand.
  name_key      TEXT NOT NULL UNIQUE,

  website       TEXT,
  linkedin_url  TEXT,
  careers_url   TEXT,

  -- How `website` was arrived at, so a guess can be told from a fact:
  --   source    — a job board handed it over (Wuzzuf does, for every company)
  --   apply-url — the job's own apply link was already on a company domain
  --   search    — resolved through a search provider; the only fallible one
  --   none      — not resolved
  resolved_via  TEXT CHECK (resolved_via IN ('source', 'apply-url', 'search', 'none')),

  -- NULL means "never tried". A timestamp means "tried then", whether or not
  -- anything was found — otherwise every run retries the same dead ends.
  enriched_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name_key   ON companies(name_key);
CREATE INDEX IF NOT EXISTS idx_companies_enriched   ON companies(enriched_at NULLS FIRST);

-- Jobs point at a company; the denormalised `jobs.company` text stays, because
-- it is what the source actually said and a job whose company cannot be
-- resolved still belongs in the pool.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- ── The lookup key ───────────────────────────────────────────
-- One function so the collector, the enricher and any ad-hoc query all fold a
-- name the same way. Two spellings that fold differently are two companies as
-- far as this table is concerned, and that is the bug this prevents.
CREATE OR REPLACE FUNCTION company_key(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(
        lower(btrim(coalesce(p_name, ''))),
        -- Legal suffixes: "Acme Inc.", "Acme, LLC" and "Acme" are one company.
        '[[:space:],]+(inc|llc|ltd|limited|gmbh|s\.?a\.?r\.?l|b\.?v|plc|co|corp|corporation|company|group|holding|holdings)\.?$',
        '', 'g'
      ),
      -- Everything that is not a letter, a digit or an Arabic character.
      '[^a-z0-9؀-ۿ]+', '', 'g'
    ),
    ''
  );
$$;

-- ── Upsert, used by the collector ────────────────────────────
-- Creates the company if it is new and returns its id, so a job row can be
-- linked in the same pass that inserts it. Deliberately does *not* enrich:
-- that is an outbound-request job and belongs in the scraper service.
CREATE OR REPLACE FUNCTION upsert_company(p_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT := company_key(p_name);
  v_id  INTEGER;
BEGIN
  -- A blank or unresolvable name ("Confidential", "-") is not a company.
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO companies (name, name_key)
  VALUES (btrim(p_name), v_key)
  ON CONFLICT (name_key) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── What still needs enriching ───────────────────────────────
-- The queue the scheduled enricher reads. Never-tried companies first, then
-- the stalest, because a company that has never been resolved is the one whose
-- job cards are currently showing an aggregator link.
--
-- 90 days is a compromise: a company's website and LinkedIn essentially never
-- change, but a careers page appears the first time a company starts hiring,
-- and that is worth catching within a quarter.
CREATE OR REPLACE FUNCTION companies_to_enrich(p_batch INT DEFAULT 40, p_max_age_days INT DEFAULT 90)
RETURNS TABLE (id INTEGER, name TEXT, website TEXT, linkedin_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.website, c.linkedin_url
  FROM companies c
  WHERE c.enriched_at IS NULL
     OR c.enriched_at < NOW() - make_interval(days => p_max_age_days)
  ORDER BY c.enriched_at NULLS FIRST, c.id
  LIMIT p_batch;
$$;

-- ── Writing the result back ──────────────────────────────────
-- `enriched_at` is stamped whether or not anything was found, so an
-- unresolvable company is not retried every hour forever.
--
-- Existing values are kept when the new run found nothing: a resolution that
-- worked last quarter and failed today is far more likely to be a site that was
-- briefly down than a company that lost its website.
CREATE OR REPLACE FUNCTION apply_company_enrichment(
  p_id           INTEGER,
  p_website      TEXT,
  p_linkedin_url TEXT,
  p_careers_url  TEXT,
  p_resolved_via TEXT
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE companies
  SET website      = COALESCE(NULLIF(p_website, ''),      website),
      linkedin_url = COALESCE(NULLIF(p_linkedin_url, ''), linkedin_url),
      careers_url  = COALESCE(NULLIF(p_careers_url, ''),  careers_url),
      resolved_via = COALESCE(NULLIF(p_resolved_via, ''), resolved_via),
      enriched_at  = NOW(),
      updated_at   = NOW()
  WHERE id = p_id;
$$;

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Reference data attached to public job listings — readable by anyone signed
-- in, writable only by the service role that runs the collectors.
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;
CREATE POLICY "Authenticated users can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- `OR REPLACE` because this whole file is meant to be safe to re-run, and a
-- plain CREATE TRIGGER fails the second time.
CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Backfill ─────────────────────────────────────────────────
-- Links the jobs already in the pool. Safe to re-run; it only touches rows that
-- are not linked yet.
INSERT INTO companies (name, name_key)
SELECT DISTINCT ON (company_key(company)) btrim(company), company_key(company)
FROM jobs
WHERE company_key(company) IS NOT NULL
ON CONFLICT (name_key) DO NOTHING;

UPDATE jobs j
SET company_id = c.id
FROM companies c
WHERE j.company_id IS NULL
  AND company_key(j.company) = c.name_key;
