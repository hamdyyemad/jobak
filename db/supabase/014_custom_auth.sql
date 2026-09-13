-- ============================================================
-- Jobak — custom auth: own the identity tables
--
-- Step 1 of the Supabase Auth removal. After this migration Supabase is a
-- Postgres host and nothing more: identity lives in `public.users`, sessions
-- live in `public.sessions`, and authorization is enforced in the application
-- layer instead of by RLS.
--
-- ── Why RLS goes away ───────────────────────────────────────
-- Every "own row" policy in this database is written as `auth.uid() = user_id`.
-- `auth.uid()` reads a claim out of the JWT that Supabase's PostgREST layer
-- injects. Once we mint our own tokens and talk to Postgres over `pg` as a
-- single application role, that function returns NULL on every call, so each of
-- those policies would deny everything — including to the app itself.
--
-- They are dropped rather than rewritten because there is no session-scoped
-- identity left for them to key off. Authorization moves to the repository
-- layer, which is the only code allowed to build a query, and which always
-- scopes by the user id taken from the verified access token.
--
-- The policies that do NOT depend on identity (public reads of jobs, sources,
-- regions, companies, the job catalogue) are left exactly as they are.
--
-- ── DESTRUCTIVE ─────────────────────────────────────────────
-- The FK repoint below cannot keep rows whose `user_id` has no matching row in
-- the new `public.users` table, and this migration deliberately does not copy
-- anything out of `auth.users`. Confirmed as dev-only data before writing.
--
-- Rows deleted: every existing user_preferences, user_job_matches,
-- search_requests, user_marketing and user_profiles row, plus the `user_id` on
-- existing feedback rows (set to NULL, the feedback text itself survives).
--
-- No BEGIN/COMMIT in this file: the runner in scripts/db/migration.ts already
-- wraps each migration in a transaction and records it in `_migrations` inside
-- that same transaction. An inner COMMIT here would close the runner's
-- transaction early and leave the bookkeeping insert outside it.
-- ============================================================

-- `citext` gives us case-insensitive email equality at the column level, so
-- "Sam@x.com" and "sam@x.com" cannot both be registered. Doing this with a
-- lower() index instead would leave every lookup site responsible for
-- remembering to normalise, which is exactly the kind of rule that gets missed.
CREATE EXTENSION IF NOT EXISTS citext;

-- ── Identity ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT NOT NULL UNIQUE,

  /*
   * Nullable on purpose. An OAuth-only account (phase B) has no password, and
   * NULL is the honest representation of that — as opposed to a sentinel hash
   * that some future code path might accidentally compare against.
   *
   * Verification must therefore treat NULL as "no password login available",
   * never as "any password matches".
   */
  password_hash     TEXT,

  full_name         TEXT,

  -- Timestamp rather than a boolean: "when did they confirm" is a question
  -- support and compliance both end up asking, and a boolean cannot answer it.
  email_verified_at TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Sessions (refresh tokens) ───────────────────────────────
/*
 * The access token is a short-lived JWT and is never stored. This table backs
 * the long-lived refresh token, and it exists so that logout actually logs
 * someone out: a purely stateless scheme cannot revoke anything before expiry.
 *
 * Only the SHA-256 of the refresh token is kept. A leaked database dump then
 * yields no usable tokens, the same reasoning that applies to passwords —
 * except this is a plain digest, because unlike a password the token is
 * 256 bits of our own randomness and is not vulnerable to guessing.
 */
CREATE TABLE IF NOT EXISTS sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,

  expires_at         TIMESTAMPTZ NOT NULL,

  /*
   * Rotation: each refresh mints a new token and marks the old row revoked
   * rather than deleting it. Keeping the spent row is what makes theft
   * detectable — a second presentation of an already-rotated token means the
   * token was captured, and the application responds by revoking the whole
   * chain for that user. A deleted row is indistinguishable from one that
   * never existed, which loses that signal.
   */
  revoked_at         TIMESTAMPTZ,
  replaced_by        UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Diagnostic only. Never used to authorize: both are client-controlled and
  -- trivially spoofed, so treating a mismatch as proof of theft would lock out
  -- real users on mobile networks that rotate IPs.
  user_agent         TEXT,
  ip_address         INET,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at       TIMESTAMPTZ
);

-- Lookup is always "find the live sessions for this user"; the partial index
-- keeps revoked history out of the hot path.
CREATE INDEX IF NOT EXISTS idx_sessions_user_active
  ON sessions(user_id) WHERE revoked_at IS NULL;

-- Supports the sweep that deletes expired rows.
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ── One-time tokens (email verification, password reset) ────
/*
 * Both flows are the same shape — a single-use secret mailed to an address,
 * good for a short window — so they share a table with a `purpose` column
 * rather than being duplicated. Hashed at rest for the same reason as refresh
 * tokens: the emailed value is the only copy that should exist in plaintext.
 */
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),

  expires_at  TIMESTAMPTZ NOT NULL,
  -- Set on redemption. The row is kept so a replayed link can be told apart
  -- from an invented one when diagnosing a support report.
  consumed_at TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_purpose
  ON auth_tokens(user_id, purpose) WHERE consumed_at IS NULL;

-- ── Drop the identity-dependent RLS policies ────────────────
-- Named individually rather than looped, so this file is a readable record of
-- exactly what protection was removed and from which table.

-- 001_initial_schema.sql
DROP POLICY IF EXISTS "Users can read own preferences"   ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can read own matches"       ON user_job_matches;
DROP POLICY IF EXISTS "Users can insert own matches"     ON user_job_matches;
DROP POLICY IF EXISTS "Users can update own matches"     ON user_job_matches;

-- 005_phase2_schema.sql
DROP POLICY IF EXISTS "own search requests" ON search_requests;
DROP POLICY IF EXISTS "own marketing row"   ON user_marketing;

-- 010_public_profiles.sql
DROP POLICY IF EXISTS "Users can read own profile"   ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- 011_feedback.sql — replaced below rather than dropped outright, because the
-- anonymous-submit path does not depend on identity and is still wanted.
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;

/*
 * Same intent as before minus the `user_id = auth.uid()` clause, which can no
 * longer be evaluated. An anonymous submitter can now attach an arbitrary
 * user_id, so the application must overwrite that field with the id from the
 * verified token (or NULL) and never pass through what the browser sent.
 */
CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

-- ── Repoint the foreign keys ────────────────────────────────
/*
 * Each table drops any row whose user_id does not exist in the new `users`
 * table — which, since `users` is empty, is all of them. This is the
 * destructive part called out in the header.
 *
 * Deleting explicitly rather than relying on the FK to fail: ADD CONSTRAINT
 * would simply error out on the first orphan and abort, which tells you less
 * and leaves nothing applied.
 *
 * The old constraints were never named explicitly — they carry whatever
 * Postgres generated, which is `<table>_<column>_fkey` by convention but is not
 * guaranteed. `DROP CONSTRAINT IF EXISTS <guessed name>` would fail *silently*
 * on a mismatch and leave the auth.users reference in place next to the new
 * one, so instead this drops whatever constraint actually points at auth.users,
 * found by catalogue lookup.
 */
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ln.nspname AS schema_name, l.relname AS table_name, c.conname
    FROM pg_constraint c
    JOIN pg_class      f  ON f.oid  = c.confrelid
    JOIN pg_namespace  fn ON fn.oid = f.relnamespace
    JOIN pg_class      l  ON l.oid  = c.conrelid
    JOIN pg_namespace  ln ON ln.oid = l.relnamespace
    WHERE c.contype = 'f'
      -- the constraint points at auth.users ...
      AND fn.nspname = 'auth'
      AND f.relname  = 'users'
      /*
       * ... and lives on one of OUR tables.
       *
       * Without this clause the loop also picks up Supabase's own internal
       * references to auth.users — auth.identities, auth.sessions,
       * auth.mfa_factors and friends. Those belong to `supabase_auth_admin`,
       * so the ALTER fails with "must be owner of table identities", and they
       * are none of this migration's business regardless.
       */
      AND ln.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                   r.schema_name, r.table_name, r.conname);
    RAISE NOTICE 'dropped auth.users FK on %.% (%)',
                 r.schema_name, r.table_name, r.conname;
  END LOOP;
END;
$$;

-- user_preferences (001) — was: REFERENCES auth.users, no delete rule
DELETE FROM user_preferences WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_job_matches (001) — was: REFERENCES auth.users, no delete rule
DELETE FROM user_job_matches WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE user_job_matches
  ADD CONSTRAINT user_job_matches_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- search_requests (005)
DELETE FROM search_requests WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE search_requests
  ADD CONSTRAINT search_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_marketing (005)
DELETE FROM user_marketing WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE user_marketing
  ADD CONSTRAINT user_marketing_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_profiles (010)
DELETE FROM user_profiles WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- feedback (011) — ON DELETE SET NULL, not CASCADE: a deleted account should
-- not take its feedback with it, the message is still worth reading.
UPDATE feedback SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users);
ALTER TABLE feedback
  ADD CONSTRAINT feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ── Rewrite set_profile_visibility (010) ────────────────────
/*
 * The original read `auth.uid()` internally to decide whose row to update,
 * which is why it could be exposed to the browser safely. With that function
 * gone the caller has to say who it is acting for, so the user id becomes a
 * parameter.
 *
 * That makes the function trusted input: anyone who can call it can publish
 * anyone's profile. It must therefore never be reachable from the browser —
 * only from the server, with an id taken from a verified access token.
 * Execute is revoked from the client-facing roles below to make that structural
 * rather than a matter of remembering.
 */
CREATE OR REPLACE FUNCTION set_profile_visibility(p_user_id UUID, p_is_public BOOLEAN)
RETURNS user_profiles
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row user_profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required';
  END IF;

  UPDATE user_profiles
  SET is_public = p_is_public,
      published_at = CASE WHEN p_is_public THEN COALESCE(published_at, NOW()) ELSE NULL END,
      slug = CASE
               WHEN p_is_public AND slug IS NULL
                 THEN claim_profile_slug(p_user_id, display_name)
               ELSE slug
             END
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- The single-argument version is now unreachable (auth.uid() is always NULL)
-- and would raise "not signed in" for everyone. Removed so no caller can bind
-- to it by accident.
DROP FUNCTION IF EXISTS set_profile_visibility(BOOLEAN);

REVOKE ALL ON FUNCTION set_profile_visibility(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- ── Lock the new tables away from the client-facing roles ───
/*
 * Nothing in the browser has any business reading these, and PostgREST exposes
 * every table in `public` by default. RLS with no policy denies all access to
 * anon/authenticated; the explicit REVOKE covers the service role path too, so
 * these tables are reachable only over our own `pg` connection.
 */
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON users       FROM anon, authenticated;
REVOKE ALL ON sessions    FROM anon, authenticated;
REVOKE ALL ON auth_tokens FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- No policy anywhere should still mention auth.uid() — expect zero rows:
--   SELECT schemaname, tablename, policyname
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND (qual::text LIKE '%auth.uid%' OR with_check::text LIKE '%auth.uid%');
--
-- Every user_id FK should now point at public.users — expect six rows:
--   SELECT conrelid::regclass AS table_name, conname
--   FROM pg_constraint
--   WHERE confrelid = 'public.users'::regclass
--   ORDER BY 1;
--
-- And the browser roles must not be able to reach the identity tables:
--   SET ROLE anon; SELECT * FROM users;   -- must fail
