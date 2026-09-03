# Supabase migrations

Applied in order by `pnpm db:migrate` (choose "Supabase"). Each file's header
comment explains what it does and why; this table is just the map.

| File | Purpose |
| --- | --- |
| `000_migrations_table.sql` | Creates `_migrations`, which tracks applied schema/feature files. |
| `000_seed_migrations_table.sql` | Creates `_seed_migrations`, which tracks applied seed files separately. |
| `001_initial_schema.sql` | Base schema: sources, regions, jobs, users, preferences. |
| `002_seed_sources.sql` | Every collector source the scraper can attribute a job to. |
| `003_seed_regions.sql` | The Arab League markets Jobak serves. Generated from `src/frontend/lib/configs/countries.ts`. |
| `004_job_catalogue.sql` | The controlled job-title vocabulary used by onboarding and the collector. |
| `005_phase2_schema.sql` | Search request queue for async onboarding/dashboard search. |
| `006_companies.sql` | Company enrichment cache (`companies` table + `jobs.company_id`). |
| `007_collect_targets_rpc.sql` | DB functions the collectors call instead of round-tripping through the app. |
| `008_apify_marketplace.sql` | `user_preferences.apify_actors` — which Apify actors a user has enabled. |
| `009_public_jobs.sql` | Public `/jobs/{slug}` pages and the LinkedIn posting queue/cursor. |
| `010_public_profiles.sql` | Opt-in public talent directory. **Read its header before changing anything** — it's the one table intentionally exposed to anonymous reads. |
| `011_feedback.sql` | Public feedback form table. Insert-only, no anonymous read policy. |
| `012_fix_matching.sql` | Repairs `match_candidate_jobs` (PGRST202) and its scoring columns. |
| `013_repair_job_data.sql` | One-off data repair for rows written by two historical mapping bugs. Run the SELECTs first. |

## Requirements

`SUPABASE_DB_URL` must be set in `.env` — the Postgres connection string from
your Supabase project's **Database > Connection string** settings, not the
API URL/anon key used by the app itself.

## Adding a migration

New file: `db/supabase/014_your_change.sql`. Follow the existing header
comment style (what it does, and why — not just what SQL follows). Never
edit a file that has already run anywhere; add a new numbered one instead.

Put `seed` in the filename (e.g. `014_seed_something.sql`) if it's seed data
rather than a schema/feature change — the runner records it in
`_seed_migrations` instead of `_migrations` so seed history can be checked on
its own.
