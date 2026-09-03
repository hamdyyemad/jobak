-- ============================================================
-- Jobak — job title catalogue
-- Applied in order by the migration runner (pnpm db:migrate).
-- ============================================================
--
-- The controlled vocabulary the onboarding dropdown offers, and the list the
-- hourly collector sweeps. It lived in a generated TypeScript file, which meant
-- the collector had to ask the app for it; here the database is the one source
-- of truth and both read the same rows.
--
-- Free text was producing unmatchable input ("dev", "s/w eng", "Softwar"), and
-- the matcher has to compare titles across sources — so both ends of that
-- comparison come from this table.

CREATE TABLE IF NOT EXISTS job_fields (
  id         INTEGER PRIMARY KEY,
  value      TEXT NOT NULL UNIQUE,   -- persisted to user_preferences.field
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_titles (
  id          SERIAL PRIMARY KEY,
  field_value TEXT NOT NULL REFERENCES job_fields(value) ON UPDATE CASCADE ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (field_value, title)
);

-- The collector pages through this in a stable order, so the sweep visits every
-- title once per cycle instead of revisiting some and skipping others.
CREATE INDEX IF NOT EXISTS idx_job_titles_order ON job_titles(field_value, sort_order);

ALTER TABLE job_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;

-- Reference data, and the onboarding form renders it — readable by anyone,
-- writable only by the service role.
DROP POLICY IF EXISTS "catalogue is readable" ON job_fields;
CREATE POLICY "catalogue is readable" ON job_fields FOR SELECT USING (true);

DROP POLICY IF EXISTS "catalogue is readable" ON job_titles;
CREATE POLICY "catalogue is readable" ON job_titles FOR SELECT USING (true);

-- ── Seed ─────────────────────────────────────────────
-- Idempotent: safe to re-run when the catalogue grows.

INSERT INTO job_fields (id, value, label, sort_order) VALUES
  (1, 'software-engineering', 'Software Engineering', 1),
  (2, 'data', 'Data & Analytics', 2),
  (3, 'ai-ml', 'AI & Machine Learning', 3),
  (4, 'devops', 'DevOps & Infrastructure', 4),
  (5, 'security', 'Security', 5),
  (6, 'design', 'Design', 6),
  (7, 'product', 'Product', 7),
  (8, 'marketing', 'Marketing', 8),
  (9, 'sales', 'Sales & Business Development', 9),
  (10, 'customer-success', 'Customer Success & Support', 10),
  (11, 'finance', 'Finance & Accounting', 11),
  (12, 'operations', 'Operations & HR', 12),
  (13, 'content', 'Content & Writing', 13)
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

INSERT INTO job_titles (field_value, title, sort_order) VALUES
  ('software-engineering', 'Frontend Engineer', 1),
  ('software-engineering', 'Backend Engineer', 2),
  ('software-engineering', 'Full Stack Engineer', 3),
  ('software-engineering', 'Mobile Engineer (iOS)', 4),
  ('software-engineering', 'Mobile Engineer (Android)', 5),
  ('software-engineering', 'React Native Engineer', 6),
  ('software-engineering', 'Embedded Systems Engineer', 7),
  ('software-engineering', 'Game Developer', 8),
  ('software-engineering', 'Software Engineer in Test', 9),
  ('software-engineering', 'Engineering Manager', 10),
  ('software-engineering', 'Staff Engineer', 11),
  ('software-engineering', 'Solutions Architect', 12),
  ('data', 'Data Analyst', 1),
  ('data', 'Data Engineer', 2),
  ('data', 'Data Scientist', 3),
  ('data', 'Analytics Engineer', 4),
  ('data', 'Business Intelligence Analyst', 5),
  ('data', 'Database Administrator', 6),
  ('data', 'Research Scientist', 7),
  ('ai-ml', 'Machine Learning Engineer', 1),
  ('ai-ml', 'AI Engineer', 2),
  ('ai-ml', 'MLOps Engineer', 3),
  ('ai-ml', 'Computer Vision Engineer', 4),
  ('ai-ml', 'NLP Engineer', 5),
  ('ai-ml', 'Prompt Engineer', 6),
  ('ai-ml', 'Applied Scientist', 7),
  ('devops', 'DevOps Engineer', 1),
  ('devops', 'Site Reliability Engineer', 2),
  ('devops', 'Platform Engineer', 3),
  ('devops', 'Cloud Engineer', 4),
  ('devops', 'Infrastructure Engineer', 5),
  ('devops', 'Release Engineer', 6),
  ('devops', 'Systems Administrator', 7),
  ('security', 'Security Engineer', 1),
  ('security', 'Application Security Engineer', 2),
  ('security', 'Penetration Tester', 3),
  ('security', 'Security Analyst', 4),
  ('security', 'Incident Response Analyst', 5),
  ('security', 'Compliance Analyst', 6),
  ('security', 'Security Architect', 7),
  ('design', 'Product Designer', 1),
  ('design', 'UX Designer', 2),
  ('design', 'UI Designer', 3),
  ('design', 'UX Researcher', 4),
  ('design', 'Graphic Designer', 5),
  ('design', 'Motion Designer', 6),
  ('design', 'Brand Designer', 7),
  ('design', 'Design Systems Designer', 8),
  ('design', 'Design Manager', 9),
  ('product', 'Product Manager', 1),
  ('product', 'Technical Product Manager', 2),
  ('product', 'Product Owner', 3),
  ('product', 'Program Manager', 4),
  ('product', 'Business Analyst', 5),
  ('product', 'Product Operations Manager', 6),
  ('marketing', 'Digital Marketing Specialist', 1),
  ('marketing', 'Content Marketer', 2),
  ('marketing', 'SEO Specialist', 3),
  ('marketing', 'Performance Marketing Manager', 4),
  ('marketing', 'Social Media Manager', 5),
  ('marketing', 'Growth Marketer', 6),
  ('marketing', 'Email Marketing Specialist', 7),
  ('marketing', 'Brand Manager', 8),
  ('marketing', 'Marketing Manager', 9),
  ('sales', 'Sales Development Representative', 1),
  ('sales', 'Account Executive', 2),
  ('sales', 'Account Manager', 3),
  ('sales', 'Solutions Engineer', 4),
  ('sales', 'Partnerships Manager', 5),
  ('sales', 'Business Development Manager', 6),
  ('sales', 'Sales Manager', 7),
  ('customer-success', 'Customer Support Specialist', 1),
  ('customer-success', 'Customer Success Manager', 2),
  ('customer-success', 'Technical Support Engineer', 3),
  ('customer-success', 'Implementation Specialist', 4),
  ('customer-success', 'Community Manager', 5),
  ('finance', 'Accountant', 1),
  ('finance', 'Financial Analyst', 2),
  ('finance', 'Controller', 3),
  ('finance', 'Bookkeeper', 4),
  ('finance', 'Payroll Specialist', 5),
  ('finance', 'Auditor', 6),
  ('finance', 'Finance Manager', 7),
  ('operations', 'Operations Manager', 1),
  ('operations', 'Project Manager', 2),
  ('operations', 'Recruiter', 3),
  ('operations', 'Technical Recruiter', 4),
  ('operations', 'People Operations Specialist', 5),
  ('operations', 'Office Manager', 6),
  ('operations', 'Executive Assistant', 7),
  ('content', 'Technical Writer', 1),
  ('content', 'Copywriter', 2),
  ('content', 'Content Strategist', 3),
  ('content', 'Editor', 4),
  ('content', 'Localization Specialist', 5)
ON CONFLICT (field_value, title) DO UPDATE SET sort_order = EXCLUDED.sort_order;
