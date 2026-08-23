-- ============================================================
-- Jobak — Apify actor selection
-- Run this in your Supabase SQL editor, after schema.sql. Safe to re-run.
-- ============================================================
--
-- Which collection actors a user has switched on.
--
-- Stored as keys rather than as a join table, because the catalogue itself
-- lives in code (services/scraper/src/apify/catalogue.ts) and not in the
-- database. That is deliberate: an actor's input mapping, output mapping,
-- pricing note and default state all have to move together, and splitting the
-- half that is data from the half that is code guarantees they drift.
--
-- The database only needs to answer "what did this user choose", and a text
-- array answers that. An unknown key is ignored by the collector rather than
-- failing it, so removing an actor from the catalogue is safe.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS apify_actors TEXT[] DEFAULT '{}';

COMMENT ON COLUMN user_preferences.apify_actors IS
  'Apify actor keys the user enabled. Empty means "use the catalogue defaults" — '
  'not "run nothing", so a user who never opened the marketplace still collects.';

/*
 * Existing users get the defaults.
 *
 * Only those who already connected a token: an empty array means "defaults" to
 * the collector anyway, so this is really about making the choice visible in
 * the settings marketplace rather than about changing behaviour. Users with no
 * token are left alone — nothing will run for them either way.
 */
UPDATE user_preferences
SET apify_actors = ARRAY['apify_wuzzuf', 'apify_bayt', 'apify_career_sites', 'apify_all_jobs']
WHERE apify_key_encrypted IS NOT NULL
  AND (apify_actors IS NULL OR cardinality(apify_actors) = 0);
