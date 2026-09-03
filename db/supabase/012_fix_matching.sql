-- ============================================================
-- Jobak — repair matching
-- Applied by the migration runner (pnpm db:migrate). Safe to re-run.
-- ============================================================
--
-- Fixes the PGRST202 the dashboard's Search button reports:
--
--   Could not find the function public.match_candidate_jobs(p_limit, p_user_id)
--   in the schema cache
--
-- Two separate problems, and creating the function without fixing the second
-- would only move the error:
--
--  1. `match_candidate_jobs` was never applied to the live database. It exists
--     in schema.sql and docs/general/PRE_PRODUCTION.md still has the unchecked box for it.
--
--  2. The version in schema.sql references `j.country_code`, and there is no
--     such column — `jobs` carries `region_id` → `regions(id)`. Running it as
--     written would create the function and then fail on every call with
--     `column j.country_code does not exist`.
--
-- It also adds the columns that make the AI's work visible. The matcher already
-- asks the model for `match_reason`, `tech_stack` and `seniority`, and the
-- workflow then writes only the score — so the "Why it matches your CV" panel
-- in the job drawer has never had anything to render.

-- ── 1. What the scorer produced, kept ────────────────────────
ALTER TABLE user_job_matches
  ADD COLUMN IF NOT EXISTS match_reason TEXT,
  -- Distinguishes "the model scored this 0" from "nothing has scored this
  -- yet". The dashboard lists unscored pool jobs alongside scored ones, and
  -- without this they are indistinguishable from a terrible match.
  ADD COLUMN IF NOT EXISTS scored_at    TIMESTAMPTZ,
  -- The model's read on the posting, which is better than the source's: most
  -- boards publish no tech stack or seniority at all.
  ADD COLUMN IF NOT EXISTS tech_stack   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority    TEXT
    CHECK (seniority IS NULL OR seniority IN ('junior', 'mid', 'senior', 'lead')),
  ADD COLUMN IF NOT EXISTS is_relevant  BOOLEAN DEFAULT true;

-- Rows written before this migration were scored, they just have no timestamp.
UPDATE user_job_matches SET scored_at = created_at WHERE scored_at IS NULL AND score IS NOT NULL;

-- The upsert in the matcher needs this; phase-2-schema.sql adds it too, so this
-- is only here to make the file self-contained.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_job_matches_user_id_job_id_key'
  ) THEN
    ALTER TABLE user_job_matches
      ADD CONSTRAINT user_job_matches_user_id_job_id_key UNIQUE (user_id, job_id);
  END IF;
END $$;

-- ── 2. Candidate selection ───────────────────────────────────
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
  prefs       user_preferences%ROWTYPE;
  v_titles    TEXT[];
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
       * Geography is region_id → regions(id), not a country_code column on
       * `jobs`. That column has never existed; the previous version of this
       * function referenced it and could not have run.
       *
       * `region_id IS NULL` passes deliberately. It is null on everything the
       * collector could not attribute — the remote-first boards, mostly — and
       * `getUserJobs` (what the dashboard displays) keeps those rows too.
       * Narrowing harder here than the dashboard does would mean the user
       * permanently sees listings the scorer refuses to look at, which reads as
       * "the AI is not working".
       */
      OR j.region_id IS NULL
      OR EXISTS (
        SELECT 1 FROM regions r
        WHERE r.id = j.region_id AND r.country_code = ANY(v_countries)
      )
    )
    AND (cardinality(v_worktypes) = 0 OR j.job_type = ANY(v_worktypes))
    AND NOT EXISTS (
      SELECT 1 FROM user_job_matches m
      WHERE m.user_id = p_user_id AND m.job_id = j.id AND m.scored_at IS NOT NULL
    )
  ORDER BY j.posted_at_source DESC NULLS LAST, j.scraped_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION match_candidate_jobs(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_candidate_jobs(UUID, INT) TO service_role;

-- ── 3. Tell PostgREST the function exists ────────────────────
-- PGRST202 is a *schema cache* error: PostgREST keeps its own picture of the
-- available functions and only refreshes it when told. Without this notify, the
-- endpoint keeps returning "could not find the function" for up to ten minutes
-- after the function is created, which looks exactly like the migration having
-- failed.
NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- Should return one row. If it returns none, the function did not get created.
--
--   SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'match_candidate_jobs';
--
-- And this should return candidate jobs for a real user id:
--
--   SELECT id, title, company FROM match_candidate_jobs('YOUR-USER-UUID'::uuid, 5);
