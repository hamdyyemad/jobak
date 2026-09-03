-- ============================================================
-- Jobak — migration bookkeeping
-- Applied first, before any other file, by the migration runner (pnpm db:migrate).
-- ============================================================
--
-- Two tables, not one, because "what schema/feature migrations have run" and
-- "what seed data has run" are different questions in practice — a seed can be
-- safely re-run to top up reference data, a schema migration usually can't.
-- Splitting them lets each be queried on its own without filtering by filename
-- pattern by hand.
--
-- The runner decides which table a given file's filename belongs in (anything
-- with `seed` in the name goes in `_seed_migrations`, everything else in
-- `_migrations`) — see scripts/db/migration.ts. Both are populated the same
-- way: one row per applied file, written in the same transaction as the file
-- itself, so a failed migration never leaves a row behind for it.

CREATE TABLE IF NOT EXISTS _migrations (
  filename    TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
