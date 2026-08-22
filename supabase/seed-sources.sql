-- Seed `sources` with every collector the workflows can attribute a job to.
--
-- jobs.source_id is a FK, so a source the table does not know about fails the
-- whole bulk insert with 23503 — not just its own row. The original schema
-- seeded only wuzzuf/remoteok/remotive, which predates the scraper service.
--
-- Names must match the scraper's source keys (services/scraper/src/sources),
-- because the collectors resolve source_id by name at runtime. Check them
-- against `GET /api/sources` after adding a source.
--
-- Idempotent: safe to re-run alongside the existing rows.

INSERT INTO sources (name, display_name, url) VALUES
  -- MENA
  ('wuzzuf',         'Wuzzuf',            'https://wuzzuf.net'),
  ('bayt',           'Bayt',              'https://www.bayt.com'),
  ('talent',         'Talent.com',        'https://www.talent.com'),
  ('forasna',        'Forasna',           'https://forasna.com'),
  -- Remote boards
  ('remoteok',       'RemoteOK',          'https://remoteok.com'),
  ('remotive',       'Remotive',          'https://remotive.com'),
  ('arbeitnow',      'Arbeitnow',         'https://www.arbeitnow.com'),
  ('jobicy',         'Jobicy',            'https://jobicy.com'),
  ('himalayas',      'Himalayas',         'https://himalayas.app'),
  ('weworkremotely', 'We Work Remotely',  'https://weworkremotely.com'),
  -- Applicant tracking systems
  ('greenhouse',     'Greenhouse boards', 'https://boards.greenhouse.io'),
  ('ashby',          'Ashby boards',      'https://jobs.ashbyhq.com'),
  ('workable',       'Workable boards',   'https://apply.workable.com')
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      url          = EXCLUDED.url;

-- The guest-endpoint LinkedIn scraper was removed from the service: it answered
-- a residential IP and refused Vercel's, so it contributed nothing from
-- production while costing a full timeout on every run.
--
-- The row is kept and deactivated rather than deleted, because jobs collected
-- through it still reference it and `apify_linkedin` still attributes to it.
UPDATE sources SET is_active = false WHERE name = 'linkedin';
