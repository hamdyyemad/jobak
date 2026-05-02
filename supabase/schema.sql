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
  work_preference        TEXT CHECK (work_preference IN ('remote', 'on-site', 'hybrid')),
  location               JSONB,
  field                  TEXT,
  skills                 TEXT[],
  experience             INTEGER,
  job_types              TEXT[],
  seniority              TEXT CHECK (seniority IN ('entry', 'mid', 'senior', 'lead')),
  salary                 JSONB,
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
