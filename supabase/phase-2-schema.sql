-- ============================================================
-- Jobak — phase 2 schema
-- Run this in your Supabase SQL editor, after schema.sql.
-- ============================================================

-- ── Search queue ────────────────────────────────────────────
-- Onboarding no longer waits for the collector. It records the request here,
-- answers the browser immediately, and triggers n8n after the response — so a
-- slow or unreachable n8n costs the user a wait instead of losing the search.
--
-- The row is also what the dashboard reads to say "still running" honestly,
-- rather than guessing from a fixed message.
CREATE TABLE IF NOT EXISTS search_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'onboarding' is the free pass kicked off when the profile is first saved.
  -- 'dashboard'  is the user pressing Search, which may also spend Apify credit.
  kind         TEXT NOT NULL DEFAULT 'onboarding' CHECK (kind IN ('onboarding', 'dashboard')),
  status       TEXT NOT NULL DEFAULT 'queued'     CHECK (status IN ('queued', 'running', 'done', 'failed')),
  detail       TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_requests_user ON search_requests(user_id, requested_at DESC);

ALTER TABLE search_requests ENABLE ROW LEVEL SECURITY;

-- The owner may watch their own request. Only the service role writes: the
-- status transitions come from the app and from n8n, never from the browser.
DROP POLICY IF EXISTS "own search requests" ON search_requests;
CREATE POLICY "own search requests" ON search_requests
  FOR SELECT USING (auth.uid() = user_id);

-- ── Marketing ───────────────────────────────────────────────
-- Attribution, asked while the first collection runs rather than before it.
-- Its own table on purpose: the collectors read user_preferences on every run,
-- and this data has no business being in that path.
CREATE TABLE IF NOT EXISTS user_marketing (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  heard_from    TEXT,   -- channel, from a fixed list
  heard_detail  TEXT,   -- free text: which friend, which creator, which search
  goal          TEXT,   -- what they want out of it
  search_status TEXT,   -- how actively they are looking
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_marketing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own marketing row" ON user_marketing;
CREATE POLICY "own marketing row" ON user_marketing
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Collection cursor ───────────────────────────────────────
-- The hourly collector walks the job-title catalogue instead of collecting only
-- what current users asked for, so the pool is already warm when someone new
-- finishes onboarding.
--
-- The catalogue is far too large to sweep in one run, so this is the pointer:
-- each run takes the next slice and moves it along, wrapping at the end. One
-- row, enforced by the CHECK — a second row would silently give two collectors
-- two different ideas of where they are.
CREATE TABLE IF NOT EXISTS collection_cursor (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  position   INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO collection_cursor (id, position) VALUES (1, 0) ON CONFLICT DO NOTHING;

ALTER TABLE collection_cursor ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only the service role reads and advances it.

-- ── Bookmarking a pool job ──────────────────────────────────
-- The dashboard now lists jobs the matcher has not scored yet, so bookmarking
-- one has to create its match row rather than update an existing one. That
-- upsert needs this constraint, as does the matcher's own
-- `on_conflict=user_id,job_id`.
--
-- schema.sql declares it inline on the table; this is here because that file
-- was only partly applied to the live database. Guarded because ADD CONSTRAINT
-- has no IF NOT EXISTS form.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_job_matches_user_id_job_id_key'
  ) THEN
    ALTER TABLE user_job_matches
      ADD CONSTRAINT user_job_matches_user_id_job_id_key UNIQUE (user_id, job_id);
  END IF;
END $$;
