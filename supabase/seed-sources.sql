-- Seed `sources` with every collector the workflows can attribute a job to.
--
-- jobs.source_id is a FK, so a source the table does not know about fails the
-- whole bulk insert with 23503 — not just its own row. The original schema
-- seeded only wuzzuf/remoteok/remotive, which predates the scraper service.
--
-- Names must match the scraper's source keys (services/scraper/src/sources),
-- because the collectors resolve source_id by name at runtime.
--
-- Idempotent: safe to re-run alongside the existing rows.

INSERT INTO sources (name, display_name, url) VALUES
  ('arbeitnow',      'Arbeitnow',         'https://www.arbeitnow.com'),
  ('jobicy',         'Jobicy',            'https://jobicy.com'),
  ('himalayas',      'Himalayas',         'https://himalayas.app'),
  ('weworkremotely', 'We Work Remotely',  'https://weworkremotely.com'),
  ('greenhouse',     'Greenhouse boards', 'https://boards.greenhouse.io'),
  ('ashby',          'Ashby boards',      'https://jobs.ashbyhq.com'),
  ('workable',       'Workable boards',   'https://apply.workable.com')
ON CONFLICT DO NOTHING;
