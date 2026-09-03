# Database

SQL migrations for every database this project uses, one subfolder per
database. Files inside each subfolder are numbered (`001_`, `002_`, ...) and
applied strictly in that order — the number *is* the migration order, so
never renumber an already-applied file. Each subfolder also has two `000_`
files that bootstrap the tracking tables (`_migrations`, `_seed_migrations`);
they always run first.

| Folder | Database | Applied by |
| --- | --- | --- |
| [`supabase/`](supabase/) | Supabase (Postgres) | `pnpm db:migrate` → pick "Supabase" |

## Running migrations

```bash
pnpm db:migrate
```

Asks which database to migrate, then applies whatever `.sql` files in that
folder have not run yet (tracked in `_migrations` and, for seed files,
`_seed_migrations`). See
[`docs/general/scripts/db/MIGRATION.md`](../docs/general/scripts/db/MIGRATION.md)
for the full runner docs, required env vars, and how to add a new database.

## Adding a migration

Add the next-numbered `.sql` file to the relevant subfolder — e.g.
`db/supabase/014_something.sql`. Don't edit a file that has already been
applied anywhere; write a new numbered file instead, the same way you would
with any migration tool.
