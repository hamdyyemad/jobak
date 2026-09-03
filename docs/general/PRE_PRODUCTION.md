# Jobak — pre-production checklist

> **Status, 2026-08-23.** Several sections below predate the scraper rebuild and
> describe a system that no longer exists — three sources, Apify actors called
> directly from n8n, `Normalize LinkedIn` / `Normalize Indeed` nodes. Those items
> are marked **superseded** where they have been overtaken rather than deleted,
> because the reasoning in them is still the reasoning that applies.
>
> Items are split by who can do them:
>
> - **`[x]` done in code** — shipped and verified in the repo.
> - **`[ ] config`** — needs an account, a DNS record or a dashboard nobody but
>   the owner can reach. No amount of code closes these.
> - **`[ ] decide`** — a product or legal call, not a task.

Things that must be done or decided before Jobak goes to production. Started
2026-08-16 while cleaning up the landing page — add to it as more turns up.

Each item notes **where** it bites, so nothing has to be rediscovered later.

---

## Source compliance (highest risk)

All user-facing copy was scrubbed on 2026-08-16: no third-party job platform is
named anywhere in the marketing surface, and "scraping" language was replaced with
neutral collection wording. What is left is not copy — it is the system itself.

- [x] **Audit every source against its terms of service.** ✅ Superseded and
      done properly: `services/scraper/src/lib/robots.ts` gates every outbound
      request against the host's live `robots.txt`, honours `Crawl-delay`, and
      fails open only when the file is unreachable. `scripts/robots-probe.ts`
      checks all 20 URLs the service requests and fails on an unexpected verdict.
      Turning it on found two violations we were already committing — Remotive's
      `Disallow: /api/*` and Wikidata's `/w/` — both fixed. The compliance
      section of `services/scraper/README.md` is now generated from evidence
      rather than from a one-off audit.
- [x] **The `Source` type still names platforms that were never implemented.**
      ✅ Resolved: `Source` is a plain `string` fed from the `sources` table, and
      the dashboard's filter row is built from the jobs actually on screen. The
      platforms named in it now genuinely exist. Original note kept below.

      <details><summary>Original</summary>
      `src/frontend/types/dashboard.ts` lists LinkedIn, Indeed and Glassdoor, none of
      which exist in the workflow (`src/backend/actions/jobs.ts` maps only
      1=Wuzzuf, 2=RemoteOK, 3=Remotive). Same fiction in
      `src/frontend/components/protected/dashboard/data.ts`. `MOCK_JOBS` and the
      hardcoded `SOURCES` list are gone — the filter row is built from the jobs
      on screen, and `sourceColor()` falls back to neutral for unknown names.
      `src/frontend/types/dashboard.ts` still lists platform names in `Source`
      only as a doc comment now, not a union.</details>
- [ ] **Decide whether the signed-in dashboard should show source names at all.**
      Showing where a listing came from is normal attribution and users need it to
      apply, but it is a product/legal call. It is behind auth, so it is not
      advertising — which is why it was left alone rather than changed silently.
- [ ] **Never re-introduce platform names into public copy.** If a source is added,
      describe it generically ("job platforms").
- [x] **Rate-limit the collection workflow** so it cannot hammer any source.
      ✅ `services/scraper/src/lib/throttle.ts` — per-host adaptive delay learned
      from observed latency, `Retry-After` and block statuses, ported from
      Scrapling's `AutoThrottle`. Starts at zero and only slows on evidence,
      because this runs in a function with an 18-second budget rather than in a
      crawler.

## OAuth configuration (code is done, config is not)

The buttons are fully wired: they call `signInWithOAuth` with a PKCE challenge and
point at `/auth/callback`, which exchanges the code for a session. Nothing further
is needed in the app. Everything below is dashboard/console work.

**Status: Google and GitHub work locally as of 2026-08-16.** LinkedIn and all
production URLs are outstanding.

- [x] **Enable Google and GitHub in Supabase** — Authentication > Providers.
      Confirmed enabled on the project.
- [x] **Create the Google and GitHub OAuth apps**, with Supabase's callback as the
      authorised redirect URI. The trap that cost us an afternoon: the URI
      registered with the provider is **Supabase's**, not ours —
      `https://<project-ref>.supabase.co/auth/v1/callback`. Putting
      `localhost` there produces `Error 400: redirect_uri_mismatch`.
      Second trap, GitHub specifically: it must be an **OAuth App**, not a
      **GitHub App**. They live in different lists under Developer settings and
      are not interchangeable. Tell them apart by the client ID prefix —
      `Ov23li…` is an OAuth App, `Iv23li…` / `Iv1.…` is a GitHub App. Using a
      GitHub App gives a 404 on the authorize page, because GitHub Apps do not
      accept the `scope` parameter Supabase sends.
- [x] **Allowlist `http://localhost:3000/**` in Supabase** — Authentication > URL
      Configuration.
- [ ] **Add LinkedIn.** Enable **LinkedIn (OIDC)** in Supabase, not the legacy
      "LinkedIn" entry: the app calls `linkedin_oidc` and the legacy provider was
      retired in January 2024. Then in the LinkedIn Developer Portal, attach the
      "Sign In with LinkedIn using OpenID Connect" product and request the
      `openid`, `profile` and `email` scopes, or the app returns unauthorised.
- [ ] **Add the production redirect URL** to the Supabase allowlist. Supabase
      silently refuses redirects that are not on this list, and the failure looks
      like a successful sign-in that drops you on the wrong page.
- [ ] **Set the Site URL** to the production origin, or password-reset and
      confirmation emails will point at localhost.
## Email

### Custom SMTP (blocking for launch)

Supabase's built-in email service is **rate limited and explicitly not for
production** — its own dashboard says so. The default allowance is a handful of
emails per hour across the whole project, shared. At launch that means signup
confirmations silently stop sending once a few people register in the same hour,
and the failure looks like "the app didn't email me" rather than an error.

- [ ] **Pick a provider.** Any SMTP host works. Reasonable options: Resend,
      Postmark, Amazon SES, SendGrid, Mailgun. Postmark and Resend have the least
      setup for transactional mail; SES is cheapest at volume.
- [ ] **Verify a sending domain** and add the DNS records the provider gives you:
      **SPF**, **DKIM**, and ideally **DMARC**. Without these, confirmation emails
      land in spam, which reads to users as a broken signup.
- [ ] **Set a real from-address** on that domain plus a from-name. Do not send
      from a personal mailbox. Recommended: `no-reply@<domain>` with sender name
      `Jobak`. Supabase has **one** sender for the whole project — there is no
      per-template from-address — so this single value covers all nine emails.
      Make it a real mailbox that forwards to support: Supabase exposes no
      Reply-To field, so a black-hole `no-reply` loses anyone who replies.
- [ ] **Create the supporting mailboxes**: `support@` (also unblocks the Contact
      page), `security@` (pair with `/.well-known/security.txt`), `abuse@` and
      `postmaster@` (expected on any sending domain, RFC 2142), and `dmarc@` for
      DMARC aggregate reports.
- [ ] **Split transactional from marketing** if marketing email ever happens:
      auth from the root domain, marketing from something like `news.<domain>`.
      Marketing complaints degrade domain reputation, and the mail that suffers is
      password resets and signup confirmations.
- [ ] **Optional: per-template senders** need the Send Email Hook (an Edge
      Function calling the provider directly), not the dashboard. Only worth it
      for routing the four security emails through `security@` so users learn to
      trust that address.
- [ ] **Enter the SMTP details** in Supabase: Authentication > Emails > SMTP
      Settings. Host, port, username, password, sender.
- [ ] **Raise the rate limits** afterwards in Authentication > Rate Limits. They
      stay at the built-in defaults even once custom SMTP is connected, so this is
      easy to miss.
- [ ] **Send one test of every template** through the real provider before launch,
      and check how each looks in Gmail, Outlook and on a phone. Dark-background
      emails are where clients differ most.

### Templates

- [ ] **Paste all nine templates** into Authentication > Emails > Templates.
      Source and the file-to-template mapping are in `email-templates/README.md`;
      regenerate with `node email-templates/build.mjs`.
      Until they are pasted, Supabase sends its defaults using
      `{{ .ConfirmationURL }}`, which relies on PKCE and therefore breaks whenever
      the recipient opens the link on a different device from the one they signed
      up on.
- [ ] **Build the password reset flow.** `05-reset-password.html` links to
      `/reset-password`, which does not exist, and `/forgot-password` is a stub
      that never calls `resetPasswordForEmail`. The template is ready; the flow is
      not.
- [ ] **Brand the Google consent screen.** Until an app name is set, Google shows
      the raw Supabase project ID to users mid sign-in. Set App name, logo,
      support email and developer contact at
      https://console.cloud.google.com/auth/branding. The name applies
      immediately; a logo goes through brand verification, which Google says can
      take a few business days. Our scopes (`openid`, `email`, `profile`) are all
      non-sensitive, so no scope review is needed.
- [ ] **Optional: Supabase custom domain** so the consent screen shows our own
      domain rather than `<ref>.supabase.co`. Paid add-on. When activating it,
      add the new callback URL to Google/GitHub *alongside* the existing one
      before switching `NEXT_PUBLIC_SUPABASE_URL`, or sign-in breaks exactly the
      way a redirect_uri mismatch does.

## Onboarding rework — database migration (added 2026-08-20)

Onboarding step 1 became multi-select, step 2 became country + worldwide (no
city), step 4 gained job titles, and step 6 accepts keys for four AI providers
instead of Groq alone. `user_preferences` had to change shape to match, so **the
new columns must exist before the reworked onboarding can save anything** — the
upsert fails outright without them.

- [ ] **Run the migration block at the bottom of `db/supabase/001_initial_schema.sql`** against
      any database that already exists. It converts `work_preference` from TEXT
      to TEXT[], adds `job_titles`, `ai_providers` and `ai_keys_encrypted`,
      carries existing Groq keys into the new map, and rewrites `location` to
      drop `city`. It is idempotent. A fresh database can just run the file's
      `CREATE TABLE` instead.
- [ ] **Retire `groq_api_key_encrypted` once nothing reads it.** It is still
      written and still read as a fallback in `src/app/api/v1/jobs/refresh/route.ts`
      for rows created before the migration. Drop the column only after those
      rows are gone.
- [ ] **Teach the n8n workflow the new payload.** Both `/api/v1/webhook/job-search`
      and `/api/v1/jobs/refresh` now send `workPreference` as an **array**,
      `location: { country, worldwide }` with no `city`, a new `jobTitles` array,
      plus `aiProvider` (the preferred one) and `aiKeys` (all of them).
      `groqApiKey` is still sent for compatibility but is empty when the user did
      not connect Groq — a workflow that assumes it is present will break.
- [ ] **Decide the fallback order for AI providers.** The API names one preferred
      provider and hands over every key; nothing yet retries with a second
      provider when the first errors or runs out of credit.

## AI key verification (added 2026-08-20)

`POST /api/v1/ai/verify-key` checks a key against its provider by listing models
(authenticated, costs nothing, spends no tokens). It requires a signed-in user
and throttles to 12 checks/minute.

- [ ] **The throttle is in-memory**, so it resets on deploy and is per-instance.
      Move it to the real rate-limiting story tracked under "Functional gaps".
- [ ] **Replace the AI provider marks with official artwork, or keep them
      deliberately abstract.** `src/frontend/components/shared/ai-provider-marks.tsx`
      draws geometric stand-ins, not the real Claude / OpenAI / Gemini / Groq
      logos. Using the real marks means reading each brand's usage terms first.
- [ ] **Prefixes are checked client-of-provider-side too**
      (`looksLikeKey` in `src/backend/lib/ai/verify-key.ts`): `sk-ant-`, `sk-`,
      `AIza`, `gsk_`. If a provider changes its key format, verification starts
      rejecting valid keys before it ever makes the request.

## Apify + workflow v2 (added 2026-08-21) — **superseded 2026-08-23**

> Replaced by the Apify marketplace: the actor catalogue, input mapping and
> output mapping now live in `services/scraper/src/apify/catalogue.ts`, users
> pick actors in Settings, and `n8n/jobak-collect-apify.json` calls
> `/api/apify` instead of one hardcoded actor. `scripts/apify-probe.ts`
> validates every actor's inputs against its published schema **without running
> anything**. The items below are kept for the reasoning; the node names they
> refer to no longer exist.

Onboarding takes at least one AI model key; an Apify token is optional and only
ever spent when the user presses Search on the dashboard.

- [ ] **Run the Apify migration** at the bottom of `db/supabase/001_initial_schema.sql`. It adds
      `user_preferences.apify_key_encrypted`, seeds sources 4 and 5, and adds a
      unique constraint on `regions.country_code`. It also **resets
      `onboarding_completed` to false** for anyone who onboarded before Apify was
      required — those users have no token and cannot run a search.
- [ ] **Import and configure the v2 workflow.** Edit the `Set Config` node:
      webhook secret, Supabase URL + service key, actor slugs, rows per source,
      batch size, and the per-provider model ids. The old workflow's webhook path
      is reused, so the app needs no env change — but do not leave both active.
- [ ] **Confirm the actors' output field names.** Still open, and still the
      most expensive failure mode — but now self-diagnosing: `ApifySource`
      counts rows that map to no title and reports the field names it actually
      saw in `meta.actors`, so a rename surfaces as a named problem instead of a
      confident zero that still bills. Original note:

      The normalizers read
      several likely names per field (`jobUrl`/`url`/`link`, …) because actor
      output is not a versioned contract. Run each actor once from the Apify
      console, compare a real dataset row against `Normalize LinkedIn` /
      `Normalize Indeed`, and pin the real names. A rename shows up as a run that
      collects zero jobs, not as an error.
- [ ] **Decide who pays for Apify.** Actors bill compute units against the
      *user's* token. `rowsPerSource` (50 per source per run) is the cost dial.
      Pair this with the rate limiting already tracked under "Functional gaps" —
      nothing currently stops a user triggering repeated paid runs.
- [ ] **Cost-check the scoring model per provider.** The Anthropic branch
      defaults to `claude-opus-5` at `effort: low`; `claude-haiku-4-5` is far
      cheaper if scoring quality allows. All four ids live in `Set Config`.
- [ ] **The Anthropic branch must not send `temperature`.** Sampling parameters
      are rejected with a 400 on current Opus/Sonnet models. The v1 workflow sent
      `temperature: 0.1` to Groq; that value was not carried into the Anthropic
      request in v2. Keep it that way if the request body is ever edited.
- [ ] **Audit the other typed columns the workflow writes.** Indeed returns
      `postedAt` as a relative phrase ("8 days ago"), which Postgres rejected
      with a 22007 on `posted_at_source` — and because the insert is bulk, one
      bad row failed all eleven. `toTimestamp()` in both normalizers plus
      `safeTimestamp()` in `Collect For Insert` now guarantee a real timestamp or
      NULL. The same all-or-nothing exposure applies to `job_type` and
      `seniority` (both CHECK-constrained) and `tech_stack` (a text[]): any actor
      field that reaches them unvalidated can fail an entire batch.
- [ ] **Retire the v1 workflow** once v2 is verified. v1 scrapes Wuzzuf and
      LinkedIn directly, which is the ToS exposure recorded under "Source
      compliance" — moving collection to Apify actors is what reduces it, and
      that only counts once v1 is off.

## Pipeline architecture — collect vs match (added 2026-08-21)

Collection and matching are now separate. `jobs` is a shared pool that scheduled
collectors fill for everyone; `user_job_matches` is the per-user scored subset
the dashboard reads. Four workflows in `n8n/`, replacing the single
`jobak-job-search-v2.json`, which has been deleted.

- [ ] **Run the SQL, in this order.** `db/supabase/001_initial_schema.sql` was only partly
      applied to the live database, which is where the `country_code`,
      `SOURCE_IDS` and `collection_runs` failures came from. There is no
      `jobs.country_code` — geography is `jobs.region_id` → `regions(id)`.
      1. `collection_runs` from `db/supabase/001_initial_schema.sql`
      2. `db/supabase/003_seed_regions.sql` — all 246 countries
      3. `db/supabase/002_seed_sources.sql` — every collector, free and Apify
      4. `db/supabase/005_phase2_schema.sql` — queue, marketing, cursor, match unique key
      5. `db/supabase/004_job_catalogue.sql` — 13 fields / 95 titles
      6. `db/supabase/012_fix_matching.sql` — **`match_candidate_jobs` + the scoring
         columns.** This is the PGRST202 the Search button reports. Note it
         supersedes the copy in `schema.sql`, which referenced a
         `jobs.country_code` that has never existed and so could be created but
         never called.
      7. `db/supabase/006_companies.sql` — company links cache + `jobs.company_id`
      8. `db/supabase/008_apify_marketplace.sql` — `user_preferences.apify_actors`
      9. `db/supabase/009_public_jobs.sql` — public job pages, `is_linkedin_posted`,
         the posting cursor and `next_linkedin_posts()`. **Widens `jobs` and
         `companies` to anonymous read** — that is the point of the public
         pages, and `user_job_matches` stays private.
      10. `db/supabase/010_public_profiles.sql` — the opt-in talent directory. Read the
          header before running it: it is the one file that deliberately opens a
          public read path, and the `public_talent` view is the security
          boundary.
      11. `UPDATE collection_cursor SET position = 0 WHERE id = 1;`

      The app degrades rather than breaks before 6-8 are applied: the dashboard
      falls back to the old columns, and Settings still loads. Apify actor
      selection simply is not persisted until 8 runs.
- [ ] **Import and schedule the four workflows.**
      `jobak-collect-public` (hourly catalogue sweep),
      `jobak-collect-private` (30 min, the titles users actually chose),
      `jobak-collect-apify` (**webhook only — never scheduled**; it spends the
      user's own credit and runs only when they press Search),
      `jobak-match-user` (webhook + 03:00 nightly).
      Each has the same `Set Config` block, edited in every workflow.
- [x] **Wire the dashboard.** Done. `getUserJobs()` returns real matches with
      tech_stack, description and correct source names; refresh triggers the
      matcher and `router.refresh()` re-reads; bookmarks persist. The dead
      `useJobs` / `useJobRefresh` / `MOCK_JOBS` were deleted.
- [ ] **Set `N8N_MATCH_WEBHOOK_URL`** to the `jobak-match` webhook. Without it
      the refresh button returns 503 and the dashboard shows a clear error, but
      nothing matches on demand.
- [ ] **Decide the empty-pool experience.** A brand-new user whose titles are not
      yet in the pool sees nothing until the next collection run. Either trigger
      an immediate collect on their terms at onboarding, or say plainly in the UI
      that first results arrive within a few hours.
- [x] **Retire `jobak-job-search-v2.json`.** Done — both copies deleted. It did
      collection and matching in one pass per user, spending Apify credit at
      onboarding, which is the thing this architecture replaces. Onboarding now
      triggers the matcher via `N8N_MATCH_WEBHOOK_URL`; `N8N_WEBHOOK_URL` is
      retired, so delete it from Vercel too.
- [ ] **Watch `collection_runs`.** `ok = false` rows, or a `found` that drops to
      zero for a source that used to return, is how a broken adapter surfaces.
      There is no alerting on it yet.
- [ ] **Tell users what their Apify token does.** It runs *their own* search
      terms only, but the listings it collects land in a shared pool other users
      can match against. That belongs in the privacy policy and probably in the
      onboarding copy.

## Legal & compliance

Deliberately deferred — the footer links were removed rather than left pointing at
pages that do not exist.

- [ ] **Privacy policy** (`/privacy`) — still linked from the signup consent text in
      `src/app/(auth)/register/page.tsx`, so that link is currently broken.
      Needs to cover what is actually stored: account email (Supabase Auth), job
      preferences and skills, the AES-256-GCM encrypted Groq key, and matched jobs.
      Third parties in the data path: Supabase, Groq, n8n.
- [ ] **Terms of service** (`/terms`) — also linked from the register page and also
      currently broken.
- [ ] **Security page** (`/security`) — optional, but the facts are real and already
      written down: AES-256-GCM key encryption, Postgres row-level security scoping
      every row per user, no resale of user data.
- [ ] **Cookie consent / banner** — Supabase Auth sets session cookies. Decide whether
      a consent banner is required for the launch regions.
- [ ] Re-add the Legal column to `src/frontend/components/public/shared/footer/data.ts`
      once these exist.

## Static assets — resolved

This was a list of six 404s: `metadata.ts` hand-wrote `<link>` tags at
`/favicon-16x16.png`, `/apple-touch-icon.png`, `/android-chrome-*.png` and
`/site.webmanifest`, none of which were ever served, because the files sat in
`src/app/` where Next only serves its own metadata conventions.

They are now file conventions and generated routes instead, so the framework
emits the tags and the assets exist at the URLs they claim:

- [x] `src/app/favicon.ico` — tile at 16/32/48
- [x] `src/app/icon.svg` — the bare mark, `sizes="any"`
- [x] `src/app/apple-icon.tsx` — the tile, full bleed, 180x180
- [x] `src/app/manifest.ts` — replaces `site.webmanifest`, names the PNGs in
      `public/icons/` (192, 512, and a separate maskable 512)
- [x] `src/app/opengraph-image.tsx` — 1200x630, reused verbatim by
      `twitter-image.tsx`

The rasters come from `brand/logo/tile.svg` via
`tsx scripts/icons/generate-icons.ts`. Re-run it when the mark changes — a stale
icon is invisible until someone installs the app.

## Metadata to confirm

- [ ] `openGraph.url` is hardcoded to `https://jobak.io` — confirm that is the real
      production domain.
- [ ] `twitter.creator` is `@jobak` — confirm the handle exists, or drop the Twitter
      metadata block. (Twitter was removed from the footer socials.)

## Search engine indexing (added 2026-08-18)

Indexing is gated on the environment so the development pipeline never competes
with production in search results, or leaks pre-release copy into the index.
The switch is `isProductionSite` in `src/frontend/lib/configs/site.ts`, read from
`NEXT_PUBLIC_APP_ENV` (falling back to `NEXT_PUBLIC_VERCEL_ENV`). It drives two
things: the `robots` block in `src/frontend/lib/configs/metadata.ts`, and
`src/app/robots.ts`, which serves `Disallow: /` off production.

**It fails closed — unset means noindex.** That is the safe direction for the dev
pipeline, but it means production silently disappears from search if the variable
is missing.

- [ ] **Set `NEXT_PUBLIC_APP_ENV=production` on the production pipeline.** Nothing
      else in the app enables indexing. `NODE_ENV` cannot be used for this: it is
      `"production"` for every built deployment, dev pipeline included.
- [ ] **Set it at build time, not just runtime.** `NEXT_PUBLIC_*` values are inlined
      during `next build`, so a variable added afterwards has no effect until the
      next build.
- [ ] **Set `NEXT_PUBLIC_APP_ENV=development` on the development pipeline** — or
      leave it unset, which gives the same result. Do it explicitly anyway so the
      intent is visible in the pipeline config.
- [ ] **Verify after the first production deploy**: `curl https://<domain>/robots.txt`
      should show `Allow: /`, and the rendered HTML should carry
      `<meta name="robots" content="index, follow">`. Check the dev domain shows the
      opposite.
- [ ] **Add a `sitemap.ts`** and reference it from `src/app/robots.ts` (production
      branch only). There is no sitemap today, so the robots file omits the
      `Sitemap:` line.

## External pages linked but not yet created

- [ ] **LinkedIn company page** — the footer links to
      `https://www.linkedin.com/company/jobak_ai`, which is not live yet.

## Deferred features (footer links removed until these exist)

These were pulled from the footer because each needs a real feature behind it, not
just a page.

- [ ] **Blog** — needs a CMS or MDX content pipeline.
- [ ] **Careers** — needs an ATS or at least real open roles.
- [ ] **Status page** — needs uptime monitoring. The hardcoded
      "All systems operational" line was removed from the footer for this reason.
- [ ] **API docs** — there is no public API for users today.
- [x] **Contact page** — ✅ Replaced by `/feedback`, which needs no mailbox:
      submissions land in the `feedback` table, readable only by the service
      role. Anonymous senders are allowed on purpose — the people best placed to
      report a wrong listing are often the ones who left before making an
      account. A `support@` alias is still worth having for replies, but it no
      longer blocks anything.

## Functional gaps

- [ ] **Contract type is never collected.** `Job.type` is hardcoded to
      "full-time" on every card because no source reports it reliably. Either
      collect it, derive it from the description, or drop the field from the UI —
      right now it asserts something the posting never said.
- [ ] **Refresh is rate-limited in memory** (30s per user, per instance), which
      resets on deploy and does not hold across instances. Same gap as the
      verify-key throttle — both want the real rate limiting.
- [ ] **No rate limiting on `/api/v1/jobs/refresh`.** Any authenticated user can trigger
      the n8n workflow as often as they like. The landing page advertises unlimited
      searches, so if that needs to change, the copy in
      `src/frontend/components/public/home/free/data.ts` has to change with it.

## Housekeeping

- [ ] **`middleware.ts` convention is deprecated** in Next 16 — the build warns on every
      run and points at `proxy` instead.
- [ ] **`useIsMobile` is unused** since the nav moved to a CSS toggle. It also trips the
      `react-hooks/set-state-in-effect` lint rule. Delete it or fix it.
- [ ] **Lint is not clean**: 5 errors / 5 warnings, mostly in
      `src/frontend/components/public/home/_unused/` and `scripts/`. Decide whether
      `_unused/` should be deleted outright.

## Public pages, talent directory, LinkedIn posting (added 2026-08-23)

Migrations, in this order. The app degrades rather than breaks before they run —
fallback selects keep Settings and the dashboard working — but nothing new
appears until they do.

- [ ] **config** — `db/supabase/012_fix_matching.sql`. The PGRST202 the Search button
      reports. Also adds the scoring columns that make the AI's reasoning
      visible.
- [ ] **config** — `db/supabase/013_repair_job_data.sql`. Repairs rows written by the
      two mapping bugs: `location = '[object Object]'`, and remote listings whose
      own text says hybrid. **Run the SELECTs at the top first** — they say how
      much is affected before anything changes.
- [ ] **config** — `db/supabase/002_seed_sources.sql` (re-run). `jobs.source_id` is a
      FK and a missing row fails the **whole** bulk insert with 23503.
- [ ] **config** — `db/supabase/006_companies.sql`, `db/supabase/008_apify_marketplace.sql`.
- [ ] **config** — `db/supabase/009_public_jobs.sql`. Public job pages, `public_slug`,
      `is_linkedin_posted`, the rotation cursor. **Widens `jobs` and `companies`
      to anonymous read** — that is the point of the public pages, and
      `user_job_matches` stays private.
- [ ] **config** — `db/supabase/010_public_profiles.sql`. Read its header first: it is
      the one file that deliberately opens a public read path, and the
      `public_talent` view is the security boundary.

Then:

- [ ] **config** — Import `n8n/jobak-post-linkedin.json`, fill `Set Config`, and
      **execute once with `LIVE = false`**. It logs the exact post text without
      publishing. Needs a LinkedIn app with the **Community Management API** and
      `w_organization_social` approved, plus the page's
      `urn:li:organization:…`. The token is 60-day — when posts stop, check that
      first.
- [ ] **config** — Paste a `/jobs/...` URL into LinkedIn's Post Inspector before
      the first live run, to confirm the Open Graph card renders.
- [ ] **decide** — The talent directory is `robots: index: false` until it has
      enough profiles to be worth finding. An indexed page of three real people
      is worse for them than no listing. Flip it in
      `src/app/(public)/talent/page.tsx` when it is populated.
- [ ] **decide** — Seed the directory with willing users before linking it
      prominently. An empty grid reads as broken.

## AI application documents (added 2026-08-23)

- [x] Provider-agnostic completion layer (`src/backend/lib/ai/complete.ts`),
      prompts (`documents.ts`), route (`/api/v1/ai/documents`), and UI in both
      the job drawer and `/dashboard/documents`.
- [ ] **The throttle is in-memory**, so it resets on deploy and is per-instance —
      same limitation already recorded for key verification. It stops a stuck
      loop, not a determined user.
- [ ] **decide** — Model defaults are per provider in `complete.ts`
      (`claude-sonnet-5`, `gpt-4o-mini`, `gemini-2.0-flash`,
      `llama-3.3-70b-versatile`). Cheaper is available; prose quality is the
      trade. This spends the user's money, so it is their setting to want.
- [ ] **Pasted CV text is sent to the provider and not stored.** Say so in the
      privacy copy if a privacy page is ever written — the UI says it, the FAQ
      does not.

## Arabic localisation — not started

Agreed scope: **UI chrome and RTL only**. Job titles and descriptions stay in
whatever language the source published them.

- [ ] **decide** — Routing. `/ar/...` path segments are correct for SEO and mean
      restructuring every route under a `[locale]` segment; a cookie plus
      `dir="rtl"` avoids the restructure but serves both languages on one URL,
      which indexes badly. This choice decides the size of the change.
- [ ] Dictionaries as `messages/en.json` and `messages/ar.json`.
- [ ] `dir="rtl"` on `<html>`, plus an audit of directional Tailwind utilities
      (`ml-`, `pl-`, `left-`, `text-left`) for logical equivalents.
- [ ] A language switcher, and `lang` on `<html>` — currently hardcoded `en` in
      `src/app/layout.tsx`.

## Feedback and support pages (added 2026-08-24)

- [ ] **config** — Run `db/supabase/011_feedback.sql`. Insert-only for `anon` and
      `authenticated`, and **no SELECT policy at all**: feedback carries names,
      emails and complaints about named employers, so only the service role
      reads it.
- [ ] **There is no in-app inbox.** Read submissions from the SQL editor — the
      query is at the bottom of that file. Building a triage UI before anyone
      has sent anything would be building the wrong thing.
- [ ] **decide** — Where feedback notifications should go. Nothing pings you
      today; a Supabase database webhook into Slack or email is the small
      version, and it needs an endpoint to point at.

### Wallets — read before adding one

`supportWallets` in `src/frontend/components/public/shared/footer/data.ts` is
**empty on purpose**, and both the footer strip and `/support` render nothing
while it is. That is not an oversight to tidy up: a placeholder tip address that
ships is money sent to a stranger, discovered only when someone tries it.

- [ ] **config** — Add the BTC and USDT addresses when they exist. The file has
      the exact shape and a four-step checklist; the short version:
      - Copy the address out of the wallet app. Never retype it.
      - `network` must name the **chain**, not the coin. "USDT" is not a
        network — USDT on TRC-20, ERC-20 and BEP-20 are different chains that
        share a name, and sending to the wrong one destroys the funds
        irrecoverably.
      - Send a test transfer of the smallest possible amount, from a different
        wallet, and confirm it arrives **before** the address is public.
      - Use a receive-only address you are content to have indexed forever. This
        goes on a public page; it will be scraped and it cannot be recalled.
- [ ] **decide** — Whether to add a fiat option too. Crypto excludes most
      casual supporters, and Buy Me a Coffee / Ko-fi are a link rather than a
      code change. `/support` is laid out so a fourth card drops in without a
      redesign.
