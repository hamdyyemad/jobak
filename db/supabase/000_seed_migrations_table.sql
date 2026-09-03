-- ============================================================
-- Jobak — seed bookkeeping
-- Applied first, before any other file, by the migration runner (pnpm db:migrate).
-- ============================================================
--
-- Tracks seed files (any filename containing `seed`, e.g. 002_seed_sources.sql)
-- separately from _migrations. See 000_migrations_table.sql for why.

CREATE TABLE IF NOT EXISTS _seed_migrations (
  filename    TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
