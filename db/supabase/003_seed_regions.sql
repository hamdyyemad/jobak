-- Seed `regions` with the markets Jobak serves.
--
-- GENERATED from src/frontend/lib/configs/countries.ts — regenerate alongside it.
--
-- Arab League members only: this is where our users are. It constrains where the
-- *candidate* lives, never where the *job* is — a worldwide remote search is
-- still the common case, and that is what the Worldwide row is for.
--
-- Idempotent, and it will not disturb the existing Egypt or Worldwide rows. If
-- an earlier, wider seed already ran, the extra rows are harmless: nothing
-- selects them any more, and deleting them would break the jobs.region_id FK on
-- anything already collected.

INSERT INTO regions (name, country_code) VALUES
  ('Algeria', 'DZ'),
  ('Bahrain', 'BH'),
  ('Comoros', 'KM'),
  ('Djibouti', 'DJ'),
  ('Egypt', 'EG'),
  ('Iraq', 'IQ'),
  ('Jordan', 'JO'),
  ('Kuwait', 'KW'),
  ('Lebanon', 'LB'),
  ('Libya', 'LY'),
  ('Mauritania', 'MR'),
  ('Morocco', 'MA'),
  ('Oman', 'OM'),
  ('Palestinian Territories', 'PS'),
  ('Qatar', 'QA'),
  ('Saudi Arabia', 'SA'),
  ('Somalia', 'SO'),
  ('Sudan', 'SD'),
  ('Syria', 'SY'),
  ('Tunisia', 'TN'),
  ('United Arab Emirates', 'AE'),
  ('Yemen', 'YE')
ON CONFLICT DO NOTHING;
