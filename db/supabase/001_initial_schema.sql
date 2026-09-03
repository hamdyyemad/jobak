-- ============================================================
-- Jobak Database Schema
-- Applied first by the migration runner (pnpm db:migrate).
-- ============================================================

-- ── Sources ─────────────────────────────────────────────────
CREATE TABLE sources (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  url          TEXT,
  is_active    BOOLEAN DEFAULT true
);

INSERT INTO sources (name, display_name, url) VALUES
  ('wuzzuf',   'Wuzzuf',    'https://wuzzuf.net'),
  ('remoteok', 'RemoteOK',  'https://remoteok.com'),
  ('remotive', 'Remotive',  'https://remotive.com');

-- ── Regions ─────────────────────────────────────────────────
CREATE TABLE regions (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  country_code TEXT
);

INSERT INTO regions (name, country_code) VALUES
  ('Egypt',     'EG'),
  ('Worldwide', NULL);

-- ── Jobs ────────────────────────────────────────────────────
CREATE TABLE jobs (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title              TEXT NOT NULL,
  company            TEXT NOT NULL,
  location           TEXT,
  job_type           TEXT CHECK (job_type IN ('remote', 'onsite', 'hybrid')),
  description        TEXT,
  apply_url          TEXT NOT NULL UNIQUE,
  salary_text        TEXT,
  posted_at_source   TIMESTAMPTZ,
  tech_stack         TEXT[]   DEFAULT '{}',
  seniority          TEXT     CHECK (seniority IN ('junior', 'mid', 'senior', 'lead')),
  is_relevant        BOOLEAN  DEFAULT true,
  source_id          INTEGER  REFERENCES sources(id),
  region_id          INTEGER  REFERENCES regions(id),
  external_id        TEXT,
  scraped_at         TIMESTAMPTZ DEFAULT NOW(),
  is_active          BOOLEAN  DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_apply_url   ON jobs(apply_url);
CREATE INDEX idx_jobs_source_id   ON jobs(source_id);
CREATE INDEX idx_jobs_scraped_at  ON jobs(scraped_at DESC);
CREATE INDEX idx_jobs_is_relevant ON jobs(is_relevant) WHERE is_relevant = true;

-- ── User Preferences ────────────────────────────────────────
CREATE TABLE user_preferences (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users NOT NULL UNIQUE,
  -- An array since onboarding step 1 became multi-select: someone can be open
  -- to remote *and* hybrid, and forcing one answer lost half the intent.
  work_preference        TEXT[] DEFAULT '{}'
                           CHECK (work_preference <@ ARRAY['remote', 'on-site', 'hybrid']),
  -- { countries: [ISO-3166-1 alpha-2, …], worldwide: boolean }. `city` was
  -- dropped (no source filters below country level), and `country` became
  -- `countries` when the picker went multi-select.
  location               JSONB,
  field                  TEXT,
  skills                 TEXT[],
  experience             INTEGER,
  job_types              TEXT[],
  -- Titles from the controlled list in src/frontend/lib/configs/job-titles.ts
  job_titles             TEXT[] DEFAULT '{}',
  seniority              TEXT CHECK (seniority IN ('entry', 'mid', 'senior', 'lead')),
  -- Salary expectations were removed from onboarding: the number was
  -- self-reported, rarely matched what a posting advertised, and the model
  -- scored better without it. The column is retained for the rows that already
  -- have one and is no longer written.
  salary                 JSONB,
  -- Providers the user connected, in pick order; the first is preferred.
  ai_providers           TEXT[] DEFAULT '{}'
                           CHECK (ai_providers <@ ARRAY['anthropic', 'openai', 'gemini', 'groq']),
  -- { provider: "iv:ciphertext" }, each value AES-256-GCM encrypted.
  ai_keys_encrypted      JSONB DEFAULT '{}'::jsonb,
  -- Apify runs the collection actors. Mandatory from onboarding onward, but the
  -- column stays nullable so rows created before it existed still load; the API
  -- sends those users back to onboarding instead of running an empty search.
  apify_key_encrypted    TEXT,
  -- Superseded by ai_keys_encrypted->>'groq'. Still written and still read as a
  -- fallback for rows created before multi-provider support.
  groq_api_key_encrypted TEXT,
  onboarding_completed   BOOLEAN DEFAULT false,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ── User Job Matches ─────────────────────────────────────────
CREATE TABLE user_job_matches (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users NOT NULL,
  job_id       UUID REFERENCES jobs(id)   NOT NULL,
  score        INTEGER CHECK (score >= 0 AND score <= 100),
  is_bookmarked BOOLEAN DEFAULT false,
  is_applied    BOOLEAN DEFAULT false,
  applied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX idx_user_job_matches_user_id ON user_job_matches(user_id);
CREATE INDEX idx_user_job_matches_score   ON user_job_matches(score DESC);

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions           ENABLE ROW LEVEL SECURITY;

-- jobs: all authenticated users can read relevant active jobs
CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (is_active = true AND is_relevant = true);

-- sources / regions: public read
CREATE POLICY "Public read sources"  ON sources FOR SELECT USING (true);
CREATE POLICY "Public read regions"  ON regions FOR SELECT USING (true);

-- user_preferences: own row only
CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- user_job_matches: own rows only
CREATE POLICY "Users can read own matches"
  ON user_job_matches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matches"
  ON user_job_matches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matches"
  ON user_job_matches FOR UPDATE USING (auth.uid() = user_id);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Migration — onboarding rework (2026-08-20)
-- ============================================================
-- Run this INSTEAD of the CREATE TABLE above on a database that already exists.
-- Safe to run more than once.

-- work_preference: single text -> text[]
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
      AND column_name = 'work_preference'
      AND data_type <> 'ARRAY'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_work_preference_check;
    ALTER TABLE user_preferences
      ALTER COLUMN work_preference TYPE TEXT[]
      USING CASE WHEN work_preference IS NULL THEN '{}'::TEXT[] ELSE ARRAY[work_preference] END;
    ALTER TABLE user_preferences ALTER COLUMN work_preference SET DEFAULT '{}';
    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_work_preference_check
      CHECK (work_preference <@ ARRAY['remote', 'on-site', 'hybrid']);
  END IF;
END $$;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS job_titles        TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ai_providers      TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ai_keys_encrypted JSONB  DEFAULT '{}'::jsonb;

-- Carry existing single-provider keys into the map.
UPDATE user_preferences
   SET ai_keys_encrypted = jsonb_build_object('groq', groq_api_key_encrypted),
       ai_providers      = ARRAY['groq']
 WHERE groq_api_key_encrypted IS NOT NULL
   AND (ai_keys_encrypted IS NULL OR ai_keys_encrypted = '{}'::jsonb);

-- location: drop the city key, add the worldwide flag.
UPDATE user_preferences
   SET location = jsonb_build_object(
         'country',   COALESCE(location->>'country', ''),
         'worldwide', COALESCE((location->>'worldwide')::boolean, false)
       )
 WHERE location ? 'city';

-- ============================================================
-- Migration — Apify credential (2026-08-21)
-- ============================================================
-- Safe to run more than once.

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS apify_key_encrypted TEXT;

-- Rows onboarded before Apify was required have no token. They cannot run a
-- search, so mark them incomplete and let onboarding collect one.
UPDATE user_preferences
   SET onboarding_completed = false
 WHERE apify_key_encrypted IS NULL
   AND onboarding_completed = true;

-- Sources the v2 workflow writes. `id` is referenced directly by the normalizer,
-- so keep these ids stable.
INSERT INTO sources (id, name, display_name, url) VALUES
  (4, 'apify_linkedin', 'LinkedIn (via Apify)', 'https://www.linkedin.com'),
  (5, 'apify_indeed',   'Indeed (via Apify)',   'https://www.indeed.com')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 1));

-- Regions are looked up by ISO code now that onboarding stores alpha-2, so the
-- workflow can upsert one on demand. Guarded because ADD CONSTRAINT has no
-- IF NOT EXISTS form.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'regions_country_code_key'
  ) THEN
    ALTER TABLE regions ADD CONSTRAINT regions_country_code_key UNIQUE (country_code);
  END IF;
END $$;

-- ============================================================
-- Migration — multi-country + salary retired (2026-08-21)
-- ============================================================
-- Safe to run more than once.

-- location: { country: "EG", … } -> { countries: ["EG"], … }
UPDATE user_preferences
   SET location = jsonb_build_object(
         'countries',
         CASE
           WHEN COALESCE(location->>'country', '') = '' THEN '[]'::jsonb
           ELSE jsonb_build_array(location->>'country')
         END,
         'worldwide', COALESCE((location->>'worldwide')::boolean, false)
       )
 WHERE location ? 'country';

-- Rows that predate the location rework entirely.
UPDATE user_preferences
   SET location = jsonb_build_object('countries', '[]'::jsonb, 'worldwide', true)
 WHERE location IS NULL
    OR NOT (location ? 'countries');

-- `salary` is deliberately NOT dropped: the column still holds real answers from
-- users who onboarded before it was retired, and dropping it is irreversible.
-- Once nothing reads it, this is the statement to run:
--   ALTER TABLE user_preferences DROP COLUMN salary;

-- ============================================================
-- Migration — shared job pool + per-user matching (2026-08-21)
-- ============================================================
-- Splits collection from matching. `jobs` becomes a shared pool that scheduled
-- collectors fill for everyone; `user_job_matches` becomes the per-user scored
-- subset that the dashboard reads. Safe to run more than once.

-- Trigram index makes the fuzzy title match below usable at scale.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Onboarding stores ISO alpha-2 now, so the pool should too. `region_id` stays
-- for the rows that already reference it, but nothing new depends on it.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country_code TEXT;

-- The pre-filter reads on these four columns and orders on the fifth.
CREATE INDEX IF NOT EXISTS idx_jobs_country     ON jobs(country_code);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type    ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_seniority   ON jobs(seniority);
CREATE INDEX IF NOT EXISTS idx_jobs_posted      ON jobs(posted_at_source DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm  ON jobs USING gin (title gin_trgm_ops);

-- Anti-join in the candidate query hits this constantly.
CREATE INDEX IF NOT EXISTS idx_matches_user_job ON user_job_matches(user_id, job_id);

-- ── Collection log ──────────────────────────────────────────
-- Scheduled collectors run unattended, so "did the 03:00 run work" has to be
-- answerable without reading n8n's execution list.
CREATE TABLE IF NOT EXISTS collection_runs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collector    TEXT NOT NULL,          -- 'public' | 'private' | 'apify'
  term         TEXT,
  country_code TEXT,
  found        INTEGER DEFAULT 0,      -- returned by the collector
  inserted     INTEGER DEFAULT 0,      -- new to the pool after dedupe
  ok           BOOLEAN DEFAULT true,
  detail       TEXT,
  ran_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_ran_at ON collection_runs(ran_at DESC);

ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only the service role writes and reads this.

-- ── Candidate selection ─────────────────────────────────────
-- The cheap half of matching. Narrows the shared pool to jobs worth paying a
-- model to score: right titles, right geography, right workplace type, and not
-- already scored for this user. The AI never sees the other 99%.
CREATE OR REPLACE FUNCTION match_candidate_jobs(p_user_id UUID, p_limit INT DEFAULT 40)
RETURNS SETOF jobs
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs      user_preferences%ROWTYPE;
  v_titles   TEXT[];
  v_countries TEXT[];
  v_worldwide BOOLEAN;
  v_worktypes TEXT[];
BEGIN
  SELECT * INTO prefs FROM user_preferences WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_titles    := COALESCE(prefs.job_titles, '{}');
  v_worldwide := COALESCE((prefs.location->>'worldwide')::BOOLEAN, TRUE);

  SELECT COALESCE(array_agg(value), '{}') INTO v_countries
    FROM jsonb_array_elements_text(COALESCE(prefs.location->'countries', '[]'::jsonb)) AS value;

  -- onboarding says 'on-site'; the jobs table says 'onsite'.
  SELECT COALESCE(array_agg(CASE WHEN w = 'on-site' THEN 'onsite' ELSE w END), '{}')
    INTO v_worktypes
    FROM unnest(COALESCE(prefs.work_preference, '{}')) AS w;

  RETURN QUERY
  SELECT j.*
  FROM jobs j
  WHERE j.is_active
    AND j.is_relevant
    AND (
      cardinality(v_titles) = 0
      OR EXISTS (
        SELECT 1 FROM unnest(v_titles) AS t
        -- Match both ways: "Backend Engineer" should find "Senior Backend
        -- Engineer", and a broad target should find a narrower posting.
        WHERE j.title ILIKE '%' || t || '%' OR t ILIKE '%' || j.title || '%'
      )
    )
    AND (
      v_worldwide
      OR cardinality(v_countries) = 0
      OR j.job_type = 'remote'                    -- remote is location-agnostic
      /*
       * Geography is region_id -> regions(id). This used to read
       * `j.country_code`, a column that has never existed on `jobs`, so the
       * function could be created and then failed on every call. See
       * db/supabase/012_fix_matching.sql.
       *
       * `region_id IS NULL` passes deliberately: it is null on everything the
       * collector could not attribute, and `getUserJobs` keeps those rows too.
       * A scorer narrower than the dashboard leaves the user staring at
       * listings nothing will ever score.
       */
      OR j.region_id IS NULL
      OR EXISTS (
        SELECT 1 FROM regions r
        WHERE r.id = j.region_id AND r.country_code = ANY(v_countries)
      )
    )
    AND (cardinality(v_worktypes) = 0 OR j.job_type = ANY(v_worktypes))
    AND NOT EXISTS (
      -- `scored_at IS NOT NULL`, not merely "a row exists": bookmarking an
      -- unscored job creates a match row, and without this a user could
      -- permanently exclude a job from scoring by starring it.
      SELECT 1 FROM user_job_matches m
      WHERE m.user_id = p_user_id AND m.job_id = j.id AND m.scored_at IS NOT NULL
    )
  ORDER BY j.posted_at_source DESC NULLS LAST, j.scraped_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION match_candidate_jobs(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_candidate_jobs(UUID, INT) TO service_role;

-- Sources the collectors write. Ids are referenced directly by the pipeline's
-- SOURCE_IDS map, so they must stay stable.
INSERT INTO sources (id, name, display_name, url) VALUES
  (6,  'arbeitnow',      'Arbeitnow',         'https://www.arbeitnow.com'),
  (7,  'jobicy',         'Jobicy',            'https://jobicy.com'),
  (8,  'himalayas',      'Himalayas',         'https://himalayas.app'),
  (9,  'weworkremotely', 'We Work Remotely',  'https://weworkremotely.com'),
  (10, 'greenhouse',     'Greenhouse',        'https://www.greenhouse.io'),
  (11, 'ashby',          'Ashby',             'https://www.ashbyhq.com'),
  (12, 'workable',       'Workable',          'https://www.workable.com')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 1));
