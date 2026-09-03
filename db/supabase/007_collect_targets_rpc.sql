-- ============================================================
-- Jobak — collection targets, as database functions
-- Applied in order by the migration runner (pnpm db:migrate), after 004_job_catalogue.sql.
-- ============================================================
--
-- The collectors used to ask the app what to collect. That made sense while the
-- job title catalogue lived in a TypeScript file; now that it is a table, every
-- input these functions need — catalogue, cursor, user preferences — is already
-- in Postgres, and the round trip through a serverless function bought nothing
-- but a timeout risk.
--
-- The on-demand Apify path deliberately stays in the app: it decrypts a user's
-- token, and `ENCRYPTION_SECRET` must never reach n8n or the database.
--
-- Both functions return the same shape the workflows already parse:
--   { "freeTerms": [ { term, countries, worldwide } ], "meta": { ... } }

-- ── Public: the catalogue sweep ─────────────────────────────
-- Takes the next `p_batch` titles and moves the pointer past them, wrapping at
-- the end of the catalogue.
--
-- The read and the advance happen under one row lock, so two overlapping runs
-- cannot collect the same slice — which the previous read-then-write across an
-- HTTP boundary could not promise.
CREATE OR REPLACE FUNCTION collect_targets_public(p_batch INT DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titles    TEXT[];
  v_total     INT;
  v_take      INT;
  v_from      INT;
  v_slice     TEXT[];
  v_countries TEXT[];
  v_terms     JSON;
BEGIN
  -- Field order then title order, so the cursor walks the same sequence every
  -- run and the sweep visits each title exactly once per cycle.
  SELECT array_agg(t.title ORDER BY f.sort_order, t.sort_order)
    INTO v_titles
    FROM job_titles t
    JOIN job_fields f ON f.value = t.field_value;

  v_total := COALESCE(array_length(v_titles, 1), 0);

  IF v_total = 0 THEN
    RETURN json_build_object(
      'freeTerms', '[]'::json,
      'meta', json_build_object('scope', 'public', 'reason', 'empty catalogue')
    );
  END IF;

  v_take := LEAST(GREATEST(p_batch, 1), v_total);

  -- FOR UPDATE holds the row until this transaction ends, which is what makes
  -- the slice-and-advance atomic.
  SELECT position % v_total INTO v_from
    FROM collection_cursor WHERE id = 1 FOR UPDATE;
  v_from := COALESCE(v_from, 0);

  UPDATE collection_cursor
     SET position = (v_from + v_take) % v_total,
         updated_at = NOW()
   WHERE id = 1;

  -- Wraps around the end of the catalogue rather than stopping short.
  SELECT array_agg(v_titles[((v_from + i) % v_total) + 1] ORDER BY i)
    INTO v_slice
    FROM generate_series(0, v_take - 1) AS i;

  /*
   * Which markets to ask about, most popular with our users first.
   */
  SELECT array_agg(code ORDER BY hits DESC, code)
    INTO v_countries
    FROM (
      SELECT c.code, count(*) AS hits
        FROM user_preferences up
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(up.location -> 'countries', '[]'::jsonb)
        ) AS c(code)
       WHERE up.onboarding_completed
         AND COALESCE((up.location ->> 'worldwide')::boolean, false) = false
       GROUP BY c.code
       ORDER BY count(*) DESC, c.code
       LIMIT 5
    ) ranked;

  /*
   * With no users yet — or only worldwide ones — fall back to every market we
   * serve rather than to an empty list.
   *
   * An empty list is not "anywhere" to the scraper; it means a physical role
   * has nowhere to be anchored, so every on-site listing is dropped, including
   * the Egyptian ones from Wuzzuf that are the whole reason that source exists.
   */
  IF v_countries IS NULL OR cardinality(v_countries) = 0 THEN
    SELECT array_agg(country_code ORDER BY country_code)
      INTO v_countries
      FROM regions
     WHERE country_code IS NOT NULL;
  END IF;

  v_countries := COALESCE(v_countries, ARRAY[]::TEXT[]);

  /*
   * `worldwide` is always true here, and it is not a synonym for "no filter":
   * it says remote-from-anywhere counts. An Arab candidate working from home
   * for a company on another continent is the core case, so a remote listing
   * qualifies regardless of where it was advertised. Non-remote listings still
   * have to sit in one of the markets above.
   */
  SELECT json_agg(json_build_object(
           'term', term,
           'countries', to_jsonb(v_countries),
           'worldwide', true
         ))
    INTO v_terms
    FROM unnest(v_slice) AS term;

  RETURN json_build_object(
    'freeTerms', COALESCE(v_terms, '[]'::json),
    'meta', json_build_object(
      'scope', 'public',
      'cursorFrom', v_from,
      'catalogSize', v_total,
      'freeTermCount', v_take,
      'countries', to_jsonb(v_countries),
      'generatedAt', NOW()
    )
  );
END;
$$;

-- ── Private: what our users actually chose ──────────────────
-- No cursor: the entire point is that every user's terms are collected on every
-- run, not a rotating slice of them.
CREATE OR REPLACE FUNCTION collect_targets_private(p_max INT DEFAULT 60)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terms JSON;
  v_users INT;
BEGIN
  SELECT count(*) INTO v_users FROM user_preferences WHERE onboarding_completed;

  /*
   * One entry per distinct (title, market) pair rather than per user: two
   * people hunting "Backend Engineer" in Egypt is one collection job, not two,
   * and the results land in a pool they both read.
   */
  WITH prefs AS (
    SELECT
      COALESCE((up.location ->> 'worldwide')::boolean, false) AS worldwide,
      CASE
        WHEN COALESCE((up.location ->> 'worldwide')::boolean, false) THEN ARRAY[]::TEXT[]
        ELSE COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(up.location -> 'countries') ORDER BY 1),
          ARRAY[]::TEXT[]
        )
      END AS countries,
      up.job_titles
    FROM user_preferences up
    WHERE up.onboarding_completed
      AND up.job_titles IS NOT NULL
  ),
  expanded AS (
    SELECT DISTINCT
      trim(term) AS term,
      p.countries,
      p.worldwide
    FROM prefs p
    CROSS JOIN LATERAL unnest(p.job_titles) AS term
    WHERE term IS NOT NULL AND trim(term) <> ''
  ),
  capped AS (
    SELECT * FROM expanded ORDER BY term LIMIT GREATEST(p_max, 1)
  )
  SELECT json_agg(json_build_object(
           'term', term,
           'countries', to_jsonb(countries),
           'worldwide', worldwide
         ))
    INTO v_terms
    FROM capped;

  RETURN json_build_object(
    'freeTerms', COALESCE(v_terms, '[]'::json),
    'meta', json_build_object(
      'scope', 'private',
      'activeUsers', v_users,
      'generatedAt', NOW()
    )
  );
END;
$$;

-- ── Grants ──────────────────────────────────────────────────
-- SECURITY DEFINER means these read `user_preferences` past RLS, so they must
-- not be reachable with the anon key. n8n calls them with the service role.
REVOKE ALL ON FUNCTION collect_targets_public(INT)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION collect_targets_private(INT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION collect_targets_public(INT)  TO service_role;
GRANT EXECUTE ON FUNCTION collect_targets_private(INT) TO service_role;
