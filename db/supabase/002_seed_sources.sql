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
  ('workable',       'Workable boards',   'https://apply.workable.com'),
  -- Apify actors. These are `source_key` values too, and jobs.source_id is a
  -- FK, so an actor missing from this table fails the whole bulk insert with
  -- 23503 rather than only its own row. Keys must match
  -- services/scraper/src/apify/catalogue.ts.
  ('apify_wuzzuf',       'Wuzzuf (Apify)',              'https://apify.com/blackfalcondata/wuzzuf-scraper'),
  ('apify_bayt',         'Bayt (Apify)',                'https://apify.com/blackfalcondata/bayt-scraper'),
  ('apify_bayt_memo',    'Bayt detailed (Apify)',       'https://apify.com/memo23/bayt-scraper'),
  ('apify_wuzzuf_alt',   'Wuzzuf alternative (Apify)',  'https://apify.com/shahidirfan/Wuzzuf-Jobs-Scraper'),
  ('apify_gulftalent',   'GulfTalent (Apify)',          'https://apify.com/scrapestorm/gulftalent-job-scraper---cheap'),
  ('apify_linkedin',     'LinkedIn (Apify)',            'https://apify.com/valig/linkedin-jobs-scraper'),
  ('apify_career_sites', 'Company career sites (Apify)','https://apify.com/fantastic-jobs/career-site-job-listing-api'),
  ('apify_all_jobs',     '39 job sites (Apify)',        'https://apify.com/agentx/all-jobs-scraper')
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
