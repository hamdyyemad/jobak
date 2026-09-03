# Database migrations

`scripts/db/migration.ts` applies the numbered SQL files under
[`db/`](../../../../db/) to a real database, tracking what already ran so
re-runs only apply what's new.

## Usage

```bash
pnpm db:migrate                       # interactive: asks which database
pnpm db:migrate supabase               # skip the prompt, target Supabase directly
pnpm db:migrate supabase --dry-run     # list pending files without applying them
```

Or via the interactive scripts menu:

```bash
pnpm scripts
# → Database → Run migrations
```

## How it works

1. You pick a database (or pass its name as an argument).
2. The runner maps that choice to a folder — `supabase` → [`db/supabase/`](../../../../db/supabase/) — and lists its `.sql` files sorted by filename, so `000_`, `001_`, `002_`, ... run in order.
3. It connects with the `pg` driver using that database's connection-string env var (`SUPABASE_DB_URL` for Supabase).
4. It runs any `000_*.sql` files first, unconditionally — these create the two tracking tables (`_migrations` and `_seed_migrations`) and are safe to run every time (`CREATE TABLE IF NOT EXISTS`).
5. Every other file is classified by filename: anything with `seed` in it (e.g. `002_seed_sources.sql`) is tracked in `_seed_migrations`; everything else is tracked in `_migrations`.
6. Each pending file runs inside its own transaction: on success the filename is recorded in its tracking table; on failure the transaction rolls back and the runner stops — nothing after it is applied.

Already-applied files are skipped on the next run, per their own tracking table. There's no "down" migration — this project's SQL files are written to be safe to re-run (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.), and rollback is handled by writing a new forward migration when needed.

## Required environment variables

Set in `.env` (see [`.env`](../../../../.env) for the full list with comments):

| Variable | Database | Where to find it |
| --- | --- | --- |
| `SUPABASE_DB_URL` | Supabase | Project Settings → Database → Connection string (URI). This is a Postgres connection string — different from `NEXT_PUBLIC_SUPABASE_URL`, which is the REST API URL the app itself uses. |

## Adding a new database

1. Create `db/<name>/` with `000_migrations_table.sql` and `000_seed_migrations_table.sql` (copy them from `db/supabase/`, they're generic), plus your numbered `.sql` files.
2. Add an entry to the `TARGETS` array in `scripts/db/migration.ts`:
   ```ts
   { key: "mydb", label: "My DB", dir: "mydb", envVar: "MYDB_DB_URL" }
   ```
3. Document the new env var in `.env` and add a row to `db/README.md`.

The picker, the folder lookup, and the "already applied" tracking all work off that one array — nothing else needs to change.

## Adding a migration to an existing database

Add the next-numbered file, e.g. `db/supabase/014_something.sql`. Never edit
a file that has already been applied anywhere (locally or in production) —
write a new numbered file instead, exactly like any other migration tool.

Put `seed` in the filename if it's seed data (e.g. `014_seed_something.sql`)
so it's tracked in `_seed_migrations` instead of `_migrations`.
