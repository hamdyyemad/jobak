-- ============================================================
-- Jobak — public job pages, and the LinkedIn posting queue
-- Run this in your Supabase SQL editor, after schema.sql. Safe to re-run.
-- ============================================================
--
-- Two things at once, because they are the same feature:
--
--  1. A job listing gets a stable public URL that anyone can open without an
--     account — `/jobs/{public_slug}`.
--  2. A scheduled workflow picks one listing at a time, posts it to the Jobak
--     LinkedIn page with that URL, and records that it did.
--
-- The selection rule is the interesting part. Posting "the newest job" every
-- time means posting ten backend roles in a row whenever a backend-heavy
-- collection lands, which reads as a bot and serves nobody looking for a
-- designer. So the cursor walks the *role catalogue* and each post is the newest
-- unposted job for the next role in the rotation. Variety across roles, recency
-- within one.

-- ── 1. Public identity for a job ─────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS public_slug        TEXT,
  ADD COLUMN IF NOT EXISTS is_linkedin_posted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_posted_at TIMESTAMPTZ,
  -- The URN of the post itself, so a listing can be traced back to what went
  -- out — and so a double-post is visible rather than silent.
  ADD COLUMN IF NOT EXISTS linkedin_post_url  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_public_slug ON jobs(public_slug) WHERE public_slug IS NOT NULL;

-- The posting queue reads this constantly: unposted, active, newest first.
CREATE INDEX IF NOT EXISTS idx_jobs_unposted
  ON jobs(created_at DESC)
  WHERE is_linkedin_posted = false AND is_active = true AND is_relevant = true;

/*
 * A readable, stable URL segment.
 *
 * Arabic is kept rather than stripped — Wuzzuf and Forasna publish Arabic
 * titles and transliterating them would produce a worse URL than the words
 * themselves. The trailing id fragment is what makes it unique: two companies
 * genuinely do post "Senior Backend Engineer" in the same week.
 */
CREATE OR REPLACE FUNCTION job_public_slug(p_title TEXT, p_company TEXT, p_id UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
    regexp_replace(
      regexp_replace(
        lower(btrim(coalesce(p_title, '') || '-' || coalesce(p_company, ''))),
        '[^a-z0-9؀-ۿ]+', '-', 'g'
      ),
      '(^-+|-+$)', '', 'g'
    ),
    70
  ) || '-' || left(replace(p_id::TEXT, '-', ''), 8);
$$;

-- Backfill, and keep new rows filled. A trigger rather than a default because
-- the slug needs the row's own id, which a DEFAULT cannot see.
CREATE OR REPLACE FUNCTION set_job_public_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_slug IS NULL THEN
    NEW.public_slug := job_public_slug(NEW.title, NEW.company, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER jobs_public_slug
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_job_public_slug();

UPDATE jobs
SET public_slug = job_public_slug(title, company, id)
WHERE public_slug IS NULL;

-- ── 2. Public read access ────────────────────────────────────
/*
 * Anyone, signed in or not, may read an active listing.
 *
 * This is a deliberate widening: `jobs` was readable only by authenticated
 * users. The whole point of a shareable URL is that the person clicking it from
 * LinkedIn has no account yet.
 *
 * What is *not* widened: `user_job_matches` stays private, so scores, bookmarks
 * and who-was-shown-what remain per-user and invisible here. A public visitor
 * sees the listing, never anyone's relationship to it.
 */
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can read active jobs" ON jobs;
CREATE POLICY "Anyone can read active jobs"
  ON jobs FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_relevant = true);

-- Sources and regions are already public read; companies is authenticated-only,
-- and the public job page shows the employer's links, so it widens too.
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;
DROP POLICY IF EXISTS "Anyone can read companies" ON companies;
CREATE POLICY "Anyone can read companies"
  ON companies FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── 3. The rotation cursor ───────────────────────────────────
/*
 * Which role the next post should be about.
 *
 * Separate from `collection_cursor` on purpose: they walk the same catalogue at
 * completely different speeds — collection sweeps every 15 minutes, posting runs
 * a few times a day — and sharing one position would let the faster one drag the
 * slower one past roles it never posted.
 */
CREATE TABLE IF NOT EXISTS linkedin_post_cursor (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  position   INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO linkedin_post_cursor (id, position) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

ALTER TABLE linkedin_post_cursor ENABLE ROW LEVEL SECURITY;
-- No policy: only the service role touches it.

-- ── 4. Picking what to post ──────────────────────────────────
/*
 * Walks the role catalogue from the cursor and returns the newest unposted job
 * for each role it can fill, up to `p_batch`.
 *
 * Deliberately does **not** mark anything as posted. LinkedIn can refuse a post
 * for a dozen reasons, and a queue that marks on selection loses a listing every
 * time one does. The workflow calls `mark_linkedin_posted` only after LinkedIn
 * confirms — see n8n/jobak-post-linkedin.json.
 *
 * The cursor advances regardless, including past roles with nothing to post.
 * Otherwise a role nobody is hiring for would block the rotation forever.
 *
 * Read and advance happen under one row lock, so two overlapping runs cannot
 * select the same job and post it twice.
 */
CREATE OR REPLACE FUNCTION next_linkedin_posts(
  p_batch        INT DEFAULT 1,
  p_max_age_days INT DEFAULT 14
)
RETURNS SETOF jobs
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titles     TEXT[];
  v_count      INT;
  v_position   INT;
  v_found      INT := 0;
  v_examined   INT := 0;
  v_title      TEXT;
  v_job        jobs%ROWTYPE;
  v_posted_ids UUID[] := '{}';
BEGIN
  SELECT COALESCE(array_agg(title ORDER BY field_value, sort_order), '{}')
    INTO v_titles
    FROM job_titles;

  v_count := cardinality(v_titles);
  IF v_count = 0 THEN RETURN; END IF;

  -- One lock for the whole call: the cursor is a single row and this is the
  -- only writer, so `FOR UPDATE` serialises overlapping runs cheaply.
  SELECT position INTO v_position FROM linkedin_post_cursor WHERE id = 1 FOR UPDATE;
  v_position := COALESCE(v_position, 0);

  /*
   * One pass over the catalogue at most. Without the `v_examined` ceiling a
   * quiet week — nothing new for any role — would spin through the roles
   * forever looking for a job that is not there.
   */
  WHILE v_found < p_batch AND v_examined < v_count LOOP
    v_title := v_titles[(v_position % v_count) + 1];
    v_position := v_position + 1;
    v_examined := v_examined + 1;

    SELECT j.* INTO v_job
    FROM jobs j
    WHERE j.is_active
      AND j.is_relevant
      AND NOT j.is_linkedin_posted
      AND j.id <> ALL(v_posted_ids)
      AND j.created_at > NOW() - make_interval(days => p_max_age_days)
      -- Match both ways, as the matcher does: "Backend Engineer" should find
      -- "Senior Backend Engineer", and a broad role a narrower posting.
      AND (j.title ILIKE '%' || v_title || '%' OR v_title ILIKE '%' || j.title || '%')
    -- Newest first: the point of the feed is that it is new.
    ORDER BY j.created_at DESC, j.posted_at_source DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      v_posted_ids := v_posted_ids || v_job.id;
      v_found := v_found + 1;
      RETURN NEXT v_job;
    END IF;
  END LOOP;

  UPDATE linkedin_post_cursor
  SET position = v_position % v_count, updated_at = NOW()
  WHERE id = 1;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION next_linkedin_posts(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_linkedin_posts(INT, INT) TO service_role;

-- ── 5. Recording a post ──────────────────────────────────────
-- Called only after LinkedIn accepts. Idempotent: re-marking an already-posted
-- job is a no-op rather than an error, so a workflow retry cannot corrupt state.
CREATE OR REPLACE FUNCTION mark_linkedin_posted(p_job_id UUID, p_post_url TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE jobs
  SET is_linkedin_posted = true,
      linkedin_posted_at = COALESCE(linkedin_posted_at, NOW()),
      linkedin_post_url  = COALESCE(NULLIF(p_post_url, ''), linkedin_post_url)
  WHERE id = p_job_id
    AND NOT is_linkedin_posted;
$$;

REVOKE ALL ON FUNCTION mark_linkedin_posted(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_linkedin_posted(UUID, TEXT) TO service_role;

-- ── Verify ───────────────────────────────────────────────────
--   SELECT title, company, public_slug FROM next_linkedin_posts(3);
--   SELECT position FROM linkedin_post_cursor;
NOTIFY pgrst, 'reload schema';
