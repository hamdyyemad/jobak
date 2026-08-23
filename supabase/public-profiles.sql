-- ============================================================
-- Jobak — the opt-in public talent directory
-- Run this in your Supabase SQL editor, after schema.sql. Safe to re-run.
-- ============================================================
--
-- A public page of candidate cards linking to their LinkedIn, for people who
-- explicitly ask to be on it.
--
-- ── Read this before changing anything below ────────────────
--
-- Every other table in this schema is private by construction: RLS scopes each
-- row to `auth.uid()` and there is no path from an anonymous request to a user's
-- data. This file deliberately opens one. That makes it the highest-risk file in
-- the project, and it is written accordingly:
--
--   * **Off by default.** `is_public` starts false. A profile is published only
--     by an authenticated request from its own owner.
--   * **The view is the boundary.** Anonymous readers are granted `public_talent`
--     and nothing else — never `user_profiles`, never `user_preferences`. The
--     column list in that view is an allowlist, so a column added to a base
--     table later cannot leak by accident.
--   * **Email is never published.** Not in the view, not behind a toggle. It is
--     the one identifier that invites the spam this feature would otherwise
--     create.
--   * **Consent is recorded.** `published_at` is when they said yes, and it is
--     cleared when they say no.
--
-- The FAQ currently answers "Who can see my preferences and matches?" with
-- "Only you." That stays true for matches; update the answer for preferences
-- when this ships, because a published profile can show field and skills.

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What the card shows. All optional, all typed by the user — nothing is
  -- copied out of their auth identity without them entering it here.
  display_name  TEXT,
  headline      TEXT,   -- "Backend engineer, 6 years, Cairo"
  bio           TEXT,
  linkedin_url  TEXT,
  github_url    TEXT,
  website_url   TEXT,
  location_label TEXT,  -- free text, so nobody is pinned to a city they did not name

  /*
   * The switch. False means the row is invisible to `public_talent` no matter
   * what else is set, which is what makes every other column safe to fill in
   * before deciding to publish.
   */
  is_public     BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,

  -- Granular consent over what is copied from `user_preferences`. Opting into
  -- the directory is not the same as opting into showing your salary-adjacent
  -- details, so each is its own answer.
  show_field      BOOLEAN NOT NULL DEFAULT true,
  show_skills     BOOLEAN NOT NULL DEFAULT true,
  show_experience BOOLEAN NOT NULL DEFAULT false,
  show_open_to    BOOLEAN NOT NULL DEFAULT true,   -- remote / on-site / hybrid

  /** URL segment. Unique, user-chosen, and free of the user's id. */
  slug          TEXT UNIQUE,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(is_public, published_at DESC)
  WHERE is_public = true;

-- ── Slug ─────────────────────────────────────────────────────
-- Derived from the display name, never from the email or the user id. A public
-- URL containing an account identifier is a small leak that lasts forever.
CREATE OR REPLACE FUNCTION profile_slug_base(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    left(
      regexp_replace(
        regexp_replace(lower(btrim(coalesce(p_name, ''))), '[^a-z0-9؀-ۿ]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      ),
      40
    ),
    ''
  );
$$;

/**
 * A free slug for this name, adding a numeric suffix on collision.
 *
 * Two people called the same thing is ordinary, and failing the second one's
 * publish with a unique-violation would be a poor way to tell them.
 */
CREATE OR REPLACE FUNCTION claim_profile_slug(p_user_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base   TEXT := COALESCE(profile_slug_base(p_name), 'member');
  v_slug   TEXT := v_base;
  v_suffix INT  := 1;
BEGIN
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE slug = v_slug AND user_id <> p_user_id) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

/*
 * Owner-only, in every direction. Note there is deliberately **no** anon SELECT
 * policy on this table: the public read path is the view below, which exposes a
 * fixed column list. Granting anon access here would publish `show_*` flags and
 * anything added to the table later.
 */
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── The public surface ───────────────────────────────────────
/*
 * The only thing anonymous visitors may read, and the only place
 * `user_preferences` is joined to something public.
 *
 * `security_barrier` stops the planner from pushing a caller's WHERE clause
 * underneath the `is_public` filter — without it a crafted predicate can be
 * used to probe rows the view is meant to hide.
 *
 * Every column here is listed on purpose. `user_preferences` holds encrypted API
 * keys in the same row as `field` and `skills`, so `SELECT *` from it is never
 * acceptable, and a view that enumerates its columns cannot start leaking one
 * that gets added later.
 */
DROP VIEW IF EXISTS public_talent;
CREATE VIEW public_talent WITH (security_barrier = true) AS
SELECT
  p.slug,
  p.display_name,
  p.headline,
  p.bio,
  p.linkedin_url,
  p.github_url,
  p.website_url,
  p.location_label,
  p.published_at,
  -- Each of these is NULL unless its own toggle is on.
  CASE WHEN p.show_field      THEN pref.field                    END AS field,
  CASE WHEN p.show_skills     THEN pref.skills                   END AS skills,
  CASE WHEN p.show_experience THEN pref.experience               END AS experience_years,
  CASE WHEN p.show_experience THEN pref.seniority                END AS seniority,
  CASE WHEN p.show_open_to    THEN pref.work_preference          END AS open_to
FROM user_profiles p
LEFT JOIN user_preferences pref ON pref.user_id = p.user_id
WHERE p.is_public = true
  -- A profile with no name and no LinkedIn is an empty card; publishing it
  -- helps nobody and looks broken.
  AND COALESCE(NULLIF(btrim(p.display_name), ''), NULLIF(btrim(p.linkedin_url), '')) IS NOT NULL;

-- Anonymous read is granted on the view alone.
GRANT SELECT ON public_talent TO anon, authenticated;

-- ── Publishing ───────────────────────────────────────────────
/*
 * One entry point for going public, so consent and slug allocation cannot drift
 * apart from each other.
 *
 * `SECURITY INVOKER` on purpose — unlike the rest of this file's helpers, this
 * one must run as the caller so RLS still proves they own the row. A definer
 * function here would let any authenticated user publish anyone.
 */
CREATE OR REPLACE FUNCTION set_profile_visibility(p_is_public BOOLEAN)
RETURNS user_profiles
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row user_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  UPDATE user_profiles
  SET is_public = p_is_public,
      -- Recorded when they say yes, cleared when they say no, so "when did
      -- this person consent" always has a truthful answer.
      published_at = CASE WHEN p_is_public THEN COALESCE(published_at, NOW()) ELSE NULL END,
      slug = CASE
               WHEN p_is_public AND slug IS NULL
                 THEN claim_profile_slug(auth.uid(), display_name)
               ELSE slug
             END
  WHERE user_id = auth.uid()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- Should return nothing on a fresh database — no one has opted in yet:
--   SELECT * FROM public_talent;
--
-- And this must fail, proving anon cannot reach the base table:
--   SET ROLE anon; SELECT * FROM user_profiles;
