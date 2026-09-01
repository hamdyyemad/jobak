-- ============================================================
-- Jobak — feedback
-- Run this in your Supabase SQL editor, after schema.sql. Safe to re-run.
-- ============================================================
--
-- A public form, so anyone can report a broken listing or ask for something
-- without an account. That makes this the only table in the schema an anonymous
-- request may write to, and the policies below are written around that.
--
-- **Insert-only for everyone.** There is deliberately no SELECT policy at all:
-- not for `anon`, not for `authenticated`. Feedback routinely contains a name,
-- an email and a complaint about a specific employer, and a public form whose
-- submissions are publicly readable is a leak waiting to be discovered. Only the
-- service role — which bypasses RLS — can read it, which means the Supabase
-- dashboard and the owner, and nothing that runs in a browser.

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Fixed list, checked in the database as well as in the form. A CHECK is what
  -- makes "the API validated it" true rather than hopeful.
  category    TEXT NOT NULL
                CHECK (category IN ('bug', 'feature', 'listing', 'praise', 'other')),

  message     TEXT NOT NULL CHECK (length(btrim(message)) BETWEEN 10 AND 4000),

  /*
   * Optional, and only so a reply is possible. Never required: demanding an
   * address is how you stop hearing about the bugs from the people least
   * willing to hand one over.
   */
  email       TEXT CHECK (email IS NULL OR length(email) <= 200),

  /** Which page they were on. Fills itself in — most reports omit it otherwise. */
  page_path   TEXT CHECK (page_path IS NULL OR length(page_path) <= 300),

  /*
   * Set when the sender happened to be signed in. Null for anonymous
   * submissions, and `ON DELETE SET NULL` so deleting an account does not
   * delete the bug report they filed — the report is about the product.
   */
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Triage, for whoever reads these.
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reading', 'done', 'spam')),

  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_triage ON feedback(status, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

/*
 * Anyone may write. Nobody may read.
 *
 * `WITH CHECK` pins the columns a submitter is allowed to set: without it an
 * anonymous insert could set `status = 'done'` and bury itself, or attach
 * someone else's `user_id` to a message they did not write.
 */
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    -- Either unattributed, or attributed to the person actually signed in.
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- No SELECT, UPDATE or DELETE policy on purpose. See the header.

/*
 * A crude flood guard in the database, so it holds regardless of which app
 * instance handled the request.
 *
 * The API's own limiter is in-memory and therefore per-instance and reset by
 * every deploy — fine against a stuck button, useless against anything
 * deliberate. This is the backstop: no more than five submissions a minute in
 * total. It is a blunt instrument and it is meant to be; a public form is a
 * spam target and losing a burst of genuine feedback during an attack is a
 * better outcome than accepting the attack.
 */
CREATE OR REPLACE FUNCTION feedback_flood_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent INT;
BEGIN
  SELECT count(*) INTO v_recent
  FROM feedback
  WHERE created_at > NOW() - INTERVAL '1 minute';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'too many submissions, please wait a moment'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER feedback_flood
  BEFORE INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION feedback_flood_guard();

-- ── Reading it ───────────────────────────────────────────────
-- There is no in-app inbox. Read it from the SQL editor:
--
--   SELECT created_at, category, email, page_path, message
--   FROM feedback WHERE status = 'new' ORDER BY created_at DESC;
--
--   UPDATE feedback SET status = 'done' WHERE id = '…';
--
-- Building a UI for this before anyone has sent anything would be building the
-- wrong thing; the query above is the whole feature until volume says otherwise.

NOTIFY pgrst, 'reload schema';
