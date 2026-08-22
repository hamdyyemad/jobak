# jobak-scraper

Job collection for Jobak. Twelve sources behind one endpoint, no per-request cost.

Built for candidates in MENA, which is the constraint that shapes everything
here: a listing only counts if someone in Cairo, Riyadh or Casablanca could
actually take it. That rules out most of what a generic remote-job aggregator
returns, and the filtering that enforces it is the most important code in the
service.

## Architecture

```
src/
  core/          JobSource (the base class), registry (the factory), pipeline
  strategies/    HOW records are obtained — injected into a source
  sources/       WHAT each board is + how to map one of its records
    mena/        wuzzuf, bayt, talent, forasna
    remote/      remoteok, remotive, weworkremotely, himalayas, jobicy, arbeitnow
    ats/         greenhouse, ashby, workable
  filters/       remote-eligibility, geography, freshness, relevance
  enrichment/    company links (website → footer → LinkedIn + careers)
  lib/           http, html, jsonld, normalize, geo
```

A source is a class extending `JobSource`, and it supplies exactly two things:
a **descriptor** (what it is) and **`toJob(raw)`** (how one record becomes a
listing). Everything else — fetching, timing out, mapping, validating,
deduping, applying the query, applying geography, applying the age limit,
reporting the outcome — is the base class's template method, so it happens the
same way for every source and cannot be half-implemented by a new one.

*How* records are obtained is a **strategy**, injected into the source:

| Strategy | For | Used by |
|---|---|---|
| `JsonFeedStrategy` | a public JSON feed | remoteok, remotive, jobicy, himalayas, arbeitnow |
| `RssFeedStrategy` | an RSS feed, parsed into tag maps | weworkremotely |
| `DetailPageStrategy` | discover URLs, fan out, read structured data | wuzzuf, bayt, talent |
| `HtmlCardStrategy` | one listing page, many cards | forasna |
| `AtsStrategy` | per-company JSON boards | greenhouse, ashby, workable |

Sources register themselves with the **registry**, which is the factory: it
builds a fresh instance per run and answers "which sources for this request".
Whether a configured source is *worth calling* is the source's own `accepts()`,
so a skip shows up in `meta.sources` with a reason instead of vanishing.

Adding a board is a descriptor, a mapper, one line in `src/sources/index.ts`,
and a row in `supabase/seed-sources.sql`.

### Registration order is load-bearing

The pipeline's dedupe keeps the **first** sighting of a posting, and the same
role is routinely cross-posted to an ATS, an aggregator and a remote board. ATS
sources are registered first, then MENA boards, then remote boards, so the copy
that survives is the one with the fullest description and the most direct apply
URL.

## Geography — the part that matters

`worldwide: true` means **hires from anywhere**, not "no filter".

The gate this replaced was one line — `if (job.job_type === "remote") return
true` — and it is why the pool filled up with `Remote Deutschland`, `Remote
(UTC+1 to UTC+2)`, `Americas, Europe, Israel`, `LATAM` and `Europe, Norway`.
Every one of those is genuinely remote. None is open to a candidate in MENA.

So a remote posting's location text is now parsed into the hiring window it
describes (`src/filters/remote-eligibility.ts`), and eligibility is an overlap
test against the markets the search asked for:

| Scope | Meaning | On a worldwide search | On a MENA search |
|---|---|---|---|
| `worldwide` | "Anywhere in the World", "Worldwide", "Global" | keep | keep |
| `restricted` | names countries, regions (EMEA, LATAM) or a UTC band | **drop** | keep iff it overlaps |
| `unknown` | a bare "Remote" — no signal either way | keep | keep |

Every row carries `remote_scope`, so a consumer that wants only the confident
ones does not have to parse the text again. `strictRemote: true` drops
`unknown` as well.

**`unknown` passes by default, deliberately.** A bare "Remote" is the single
most common location value across these feeds, the AI scorer downstream is what
actually decides what a user sees, and dropping them costs far more real
matches than it saves bad ones.

Physical roles qualify the other way: matched against the location text only, on
word boundaries, with city aliases. A country code counts only as a standalone
uppercase token — a two-letter substring match is how "ger**ma**ny" once matched
Morocco and "**so**ftware" matched Somalia.

`maxAgeDays: 1` keeps only what was posted today. Undated listings still pass —
several feeds publish "latest N" without dating every row.

## The sources

| Key | Kind | Geography | Default | Notes |
|---|---|---|---|---|
| `wuzzuf` | detail | EG, SA, AE | on | Sitemap → detail pages. **Carries company website + LinkedIn.** |
| `bayt` | detail | MENA-wide | **off** | Correct parser, blocked runtime — see below |
| `talent` | detail | 12 MENA subdomains | on | Aggregator; full `JobPosting` per detail page |
| `forasna` | html | EG (Arabic) | **off** | `Crawl-delay: 10`; blue-collar pool — see below |
| `remoteok` | api | remote-only | on | ~100 latest |
| `remotive` | api | remote-only | on | States a real hiring window |
| `weworkremotely` | rss | remote-only | on | `<region>` is a real hiring window |
| `himalayas` | api | remote-only | on | `locationRestrictions` is a real hiring window |
| `jobicy` | api | remote-only | on | `?count=` works; `?tag=` does not |
| `arbeitnow` | api | company | on | Europe-weighted; gated to remote-leaning searches |
| `greenhouse` | ats | company | on | Needs slugs |
| `ashby` | ats | company | on | Needs slugs |
| `workable` | ats | company | on | Needs slugs; widely used across MENA |

### Wuzzuf is worth understanding

Its search pages are useless to a plain HTTP client — `/search/jobs/` is
Cloudflare-gated, and the `/a/{Query}-Jobs-in-{Country}` route the previous
adapter parsed has become a client-rendered shell that answers with its
templates unfilled (`<title>{{keyword}} jobs in {{locationName}}</title>`) and
contains exactly one job link. **That adapter was returning almost nothing long
before anyone noticed**, which is most of why a search from Cairo came back full
of European remote roles.

Its detail pages, on the other hand, inline the site's entire Redux store as
`Wuzzuf.initialStoreState`. That gives fully structured jobs — workplace
arrangement, city, country code, salary bounds, posting date, Arabic
translations — and, in the linked `company` entity, `website` and
`linkedinProfile`. One page also carries ~17 postings, so the fan-out is far
cheaper than one request per job.

Discovery is `sitemap-job-1.xml` (~5,600 URLs in one request), whose slugs carry
the title, company and country in plain text — enough to narrow to the search
before spending a request.

### Bayt is off, and it is not the parser

Bayt publishes an `ItemList` on search pages and a complete `JobPosting` on
every detail page. The parser here reads both correctly, verified live.

Cloudflare rejects **this runtime**, not this code. `curl` fetches every Bayt
URL with a 200; Node's `fetch` gets a 403 "Attention Required" on all of them —
listing pages, detail pages, even `sitemap.xml` — because undici's TLS
fingerprint is not a browser's. No header, user-agent or delay changes that; it
is decided before the request is sent.

Turn it on the day the service has a client that can impersonate a browser
(curl-impersonate, or a residential proxy that terminates TLS itself). Until
then it would only burn a timeout.

### Forasna is off for two honest reasons

Its `robots.txt` asks for `Crawl-delay: 10`, which rules out the detail-page
fan-out the other MENA sources use — so it makes exactly one request per run and
reads the server-rendered cards. And its pool is overwhelmingly Arabic and
blue-collar (سائق, عامل نظافة, خياطة) while the catalogue the collector sweeps
is English professional titles, so a search for "Backend Engineer" matches
nothing there. Turn it on for the Arabic administrative and sales titles it
genuinely covers (محاسب, سكرتيرة, مندوب مبيعات), where it is the best source in
the set.

### ATS slugs are where the quality is

These are the best listings anywhere — first-party, complete descriptions,
always current, and the apply URL is the company's own, so they need no
enrichment at all. The catch is that an ATS can only be asked "what is hiring at
*this* company", so you supply slugs in the `ats` request field. Grow the list
over time; verified working examples:

```jsonc
{ "greenhouse": ["careem"], "ashby": ["rain"], "workable": ["foodics"] }
```

A slug that answers `200` with an empty `jobs` array is a real account with
nothing open — that is normal. A slug that *fails* is now reported in
`meta.sources` as `partial — <slug>: <error>`, because an ATS answers "nothing
open" and "could not reach" with the same empty array otherwise, and a
hand-maintained slug list goes stale.

## Endpoints

All three require `x-scraper-secret`.

### `POST /api/scrape`

```jsonc
{
  "query": "Backend Engineer",           // required
  "countries": ["EG", "AE"],             // or [{ "code": "EG", "name": "Egypt" }]
  "worldwide": false,
  "workPreference": ["remote", "on-site"],
  "limit": 25,                           // per source, max 100
  "maxAgeDays": 1,                       // optional; 1 means "posted today"
  "strictRemote": false,                 // optional; drops `unknown` scopes
  "sources": ["wuzzuf", "talent"],       // optional; omit for the defaults
  "ats": { "greenhouse": ["careem"], "workable": ["foodics"] }
}
```

Returns `{ jobs, meta }`. `jobs` are in the shape the `jobs` table expects, plus
`remote_scope`, `language` and (where a source knew) `company_links` — all
optional fields that an existing consumer ignores.

`meta.sources` reports every source individually, including `fetched` (rows
before filtering) alongside `count` (rows kept). A source returning 350 and
keeping 8 is working correctly; a source returning 0 is not.

### `POST /api/enrich`

Resolves what a job ad hides: the employer's own site, LinkedIn page and careers
page.

```jsonc
{
  "companies": [
    { "name": "Careem", "website": "https://www.careem.com" },
    { "name": "Foodics", "applyUrl": "https://apply.workable.com/j/26B9363EE8" }
  ],
  "useSearch": true                      // optional; false skips the search step
}
```

Separate from `/api/scrape` because resolving one company costs up to three
outbound requests, and because the answer changes on a different clock: a
company's website changes roughly never, its open roles change hourly. Cache the
result in `companies` (see `supabase/companies.sql`) and never ask twice.

The chain is tiered by cost, and only the last step can be wrong:

1. **The source already knows** — Wuzzuf gives `website` and `linkedinProfile`
   for every company; a `JobPosting` often gives `hiringOrganization.sameAs`.
2. **The apply URL is already the company's** — true whenever a company self-
   hosts its board.
3. **Search** — opt-in, and off unless `BRAVE_SEARCH_API_KEY` is set.

Step 3 is an API key rather than a scraper on purpose: DuckDuckGo's `robots.txt`
disallows both `/lite` and `/html`, and Google and Bing disallow their result
pages outright. Scraping a search engine for this would be the one genuinely
non-compliant thing in the service.

Everything degrades rather than fails — an unresolvable company comes back with
nulls and `resolvedVia: "none"`, and the caller shows the aggregator link as it
does today.

### `GET /api/sources`

The catalogue: every source, its kind, geography, language, and whether it is on
by default — with the note explaining why, for the ones that are off.

## Wiring it up

1. Run `supabase/seed-sources.sql` — `jobs.source_id` is a FK, and a source the
   table does not know about fails the **whole** bulk insert with 23503.
2. Run `supabase/companies.sql` for the enrichment cache and `jobs.company_id`.
3. In each n8n workflow's `Set Config` node, fill the `ATS` slug list — it ships
   empty, which is why the highest-quality sources had never returned a row.
4. To populate company links, add a step after `Insert Jobs (bulk)`:
   `companies_to_enrich(40)` → `POST {scraperUrl}/api/enrich` →
   `apply_company_enrichment(...)` per row.

## Deploying

A **separate Vercel project** from the main app, pointed at this directory:

1. New Project → same repository → **Root Directory: `services/scraper`**
2. Framework preset: **Other** (the `api/` folder is picked up automatically)
3. Environment variables: `SCRAPER_SECRET` (required),
   `BRAVE_SEARCH_API_KEY` (optional) — see `.env.example`

Separate so a slow or blocked source can never consume the user-facing app's
function budget, and so this can be redeployed without touching Jobak.

## What this does not solve

**LinkedIn and Indeed want residential IPs.** The guest-endpoint LinkedIn source
has been removed: it answered a home connection and refused Vercel's, so it
contributed nothing from production while costing a full timeout on every run. A
source that reliably returns zero is worse than no source, because it looks like
coverage. Apify remains the honest answer for those two.

**Cloudflare fingerprints the client, not the request.** Bayt is the case study;
see above. Nothing in the header-tweaking family fixes it.

**No browser.** Everything here is `fetch` plus parsing. Chromium does not fit
Vercel's bundle limits comfortably and its cold starts eat the function budget.
The detail-page strategy exists precisely so that client-rendered sites can be
read without one — by targeting the structured data they publish for search
engines, which is server-rendered by necessity.

**Feeds are "latest N", not searchable archives.** None of the remote-board APIs
support server-side search, so the query is applied here against a few hundred
recent postings.

## Compliance

Every source is fetched from a path its `robots.txt` allows for `User-agent: *`,
checked at the time of writing:

- **Wuzzuf** and **Forasna** publish `Content-Signal: search=yes, ai-train=no,
  use=reference` and `Allow: /`. Wuzzuf disallows `/*?q=` and filter URLs; the
  sitemap and `/jobs/p/` detail pages used here are not covered. Forasna asks
  for `Crawl-delay: 10`, honoured by making one request per run.
- **Bayt** disallows `/en/jobs/*-jobs/`; the country-scoped `/en/{country}/jobs/`
  paths used here are a different prefix and are not covered.
- **Talent.com** disallows `/services/api-new/search`, `/search-jobs/*`,
  `/redirect*` and `/ajax/*`; `/jobs` and `/view` are not covered.

Two things worth deciding deliberately rather than inheriting:

- This service sends a **Chrome user-agent**, as the code it replaces did. It is
  a bot, and a bot identifying itself as Chrome is a choice, not an accident.
- Wuzzuf and Forasna both `Disallow: /` for **ClaudeBot, GPTBot, CCBot and
  Google-Extended**, and signal `ai-train=no`. Collecting for search and
  reference is what they permit; the descriptions collected here are later sent
  to an LLM for **scoring**, which is retrieval, not training. That is not
  restricted by their signal, but it is close enough to the line to be a
  conscious call.

## Working on it

```bash
cd services/scraper
pnpm install --ignore-workspace

npx tsc --noEmit                              # typecheck
npx tsx scripts/probe.ts                      # every source, live, worldwide remote
SCENARIO=mena npx tsx scripts/probe.ts        # Egypt + Saudi + UAE
npx tsx scripts/probe.ts wuzzuf talent        # just these
npx tsx scripts/enrich-probe.ts               # the company-link chain
```

`probe.ts` is the check that matters. These sources depend on contracts living
on other people's servers, so compiling proves very little — run it after any
source change, and first whenever a source starts returning zero in production.
It fails the process on any field-level integrity problem (unparseable date,
HTML left in a description, bad `job_type`), because those are what break the
bulk insert downstream.

**Read the location histogram, not the counts.** A source can return plenty of
jobs and still be returning the wrong ones — that table is where you see whether
the eligibility filter is still holding. When a city shows up in the `unknown`
bucket, add it to `WORLD_CITIES` in `src/lib/geo.ts`.
