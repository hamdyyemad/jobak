-- ============================================================
-- Jobak — repair job rows written by the two mapping bugs
-- Applied by the migration runner (pnpm db:migrate). Safe to re-run.
-- ============================================================
--
-- The code fixes in services/scraper only affect *future* collections. These
-- rows are already in the pool and will keep rendering wrongly until they are
-- corrected or re-collected.
--
--  1. `jobs.location = '[object Object]'` — `clean()` used `String(value)`, and
--     several sources publish `location` as `{ city, country }`. Every mapper
--     funnels through `clean`, so one blind stringification reached the cards.
--  2. `jobs.job_type = 'remote'` on listings whose own text says Hybrid — six
--     mappers were written as `flag === true ? 'remote' : infer(...)`, letting a
--     boolean beat the words. Those flags mean "not fully on-site", so boards
--     set them for hybrid roles too.
--
-- Run the SELECTs first. They tell you how much is affected before anything is
-- changed, and on a healthy database they return zero rows.

-- ── 1. Look before you leap ──────────────────────────────────
-- How many rows carry the stringified-object location?
--   SELECT source_id, count(*) FROM jobs
--   WHERE location ILIKE '%[object%' GROUP BY source_id ORDER BY 2 DESC;
--
-- How many remote rows describe themselves as hybrid?
--   SELECT id, title, company, location FROM jobs
--   WHERE job_type = 'remote'
--     AND (title ILIKE '%hybrid%' OR description ILIKE '%hybrid%' OR location ILIKE '%hybrid%')
--   LIMIT 50;

-- ── 2. The unreadable locations ──────────────────────────────
/*
 * Blanked rather than guessed at. The structured value that produced this was
 * never stored, so there is nothing to recover it from — and an empty location
 * is honest where "[object Object]" is not.
 *
 * These rows keep everything else: title, company, description and apply URL
 * are all unaffected, so the listing stays useful. The next collection run
 * re-upserts on `apply_url` and fills the location in properly.
 */
UPDATE jobs
SET location = ''
WHERE location ILIKE '%[object%';

-- ── 3. The mislabelled remote roles ──────────────────────────
/*
 * Only where the listing's own words say hybrid. This deliberately does not
 * touch rows that merely *might* be wrong: a remote row with no contrary
 * evidence is left alone, because re-labelling on a guess is the same class of
 * mistake that caused this.
 *
 * `\m` and `\M` are Postgres word boundaries — without them "hybridise" and any
 * URL containing the substring would match.
 */
UPDATE jobs
SET job_type = 'hybrid'
WHERE job_type = 'remote'
  AND (
    title       ~* '\mhybrid\M'
    OR location ~* '\mhybrid\M'
    -- Only the opening of the description: a "we also offer hybrid roles"
    -- sentence buried in a benefits section is not this posting's arrangement.
    OR left(coalesce(description, ''), 600) ~* '\mhybrid\M'
  );

-- ── 4. Same two bugs, same fix, for the matcher's copy ───────
-- `user_job_matches` stores no location or job type, so nothing to repair there.
-- Scores computed against a wrong workplace type are stale rather than wrong in
-- the database; the next scoring pass overwrites them.

-- ── 5. Report ────────────────────────────────────────────────
DO $$
DECLARE
  v_blank INT;
  v_hybrid INT;
BEGIN
  SELECT count(*) INTO v_blank  FROM jobs WHERE location = '';
  SELECT count(*) INTO v_hybrid FROM jobs WHERE job_type = 'hybrid';
  RAISE NOTICE 'jobs with a blank location: %  |  jobs now marked hybrid: %', v_blank, v_hybrid;
END $$;
