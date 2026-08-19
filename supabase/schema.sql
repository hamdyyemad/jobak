-- ============================================================
-- Jobak Database Schema
-- Run this in your Supabase SQL editor
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
  -- { country: ISO-3166-1 alpha-2 | "", worldwide: boolean }. `city` was dropped
  -- from onboarding — no source we query filters below country level.
  location               JSONB,
  field                  TEXT,
  skills                 TEXT[],
  experience             INTEGER,
  job_types              TEXT[],
  -- Titles from the controlled list in src/frontend/lib/configs/job-titles.ts
  job_titles             TEXT[] DEFAULT '{}',
  seniority              TEXT CHECK (seniority IN ('entry', 'mid', 'senior', 'lead')),
  salary                 JSONB,
  -- Providers the user connected, in pick order; the first is preferred.
  ai_providers           TEXT[] DEFAULT '{}'
                           CHECK (ai_providers <@ ARRAY['anthropic', 'openai', 'gemini', 'groq']),
  -- { provider: "iv:ciphertext" }, each value AES-256-GCM encrypted.
  ai_keys_encrypted      JSONB DEFAULT '{}'::jsonb,
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
