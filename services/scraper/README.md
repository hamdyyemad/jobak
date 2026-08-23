# jobak-scraper

Job collection for Jobak. Thirteen free sources, seven optional paid ones,
behind one service.

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
    apify/       ApifySource — a paid actor wearing the same clothes
  apify/         the actor catalogue (the marketplace) + the Apify client
  filters/       remote-eligibility, geography, freshness, relevance
  enrichment/    company links (website → footer → LinkedIn + careers)
  lib/           http, robots, throttle, sitemap, html, jsonld, sanitize, normalize, geo
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
| `JsonFeedStrategy` | a public JSON feed | remoteok, jobicy, himalayas, arbeitnow |
| `RssFeedStrategy` | an RSS feed, parsed into tag maps | weworkremotely, remotive |
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
| `remotive` | rss | remote-only | on | States a real hiring window. Its JSON API is `Disallow: /api/*` |
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

Discovery starts at `sitemap.xml` and descends into every `sitemap-*-job-N.xml`
shard it lists (~5,600 URLs across two files today). The slugs carry the title,
company and country in plain text — enough to narrow to the search before
spending a request on a page.

It used to name `sitemap-job-1.xml` directly. That `-1` is Wuzzuf saying it
intends to shard, and the day it adds a `-2` the hardcoded version would have
kept working while silently returning half the market.

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

The chain is tiered by evidence, costs nothing, and only the last step can be
wrong:

1. **The source already knows** — Wuzzuf gives `website` and `linkedinProfile`
   for every company; a `JobPosting` often gives `hiringOrganization.sameAs`.
2. **The apply URL is already the company's** — true whenever a company self-
   hosts its board.
3. **Wikidata** — the `official website` property (P856). Curated, so when it
   has an entry it is right; it only knows companies notable enough to have one.
4. **A verified domain guess** — `acme.com`, `acme.io`, `acme-inc.com`... accepted
   only if the company's name appears in the page's `<title>` or `og:site_name`.

Every result carries how it was reached, all the way to
`companies.resolved_via`, because **step 4 can be confidently wrong**: "Tabby"
the fintech is `tabby.ai`, but `tabby.com` is a kids' tablet whose title
contains the word. Filter on `resolved_via` if you need facts rather than leads.

No search engine is involved, and not for want of trying — every one of them is
closed to this. `duckduckgo.com/robots.txt` disallows `/lite` and `/html`,
`api.duckduckgo.com` is `Disallow: /` (the Instant Answer API included), and
Google and Bing disallow their result pages outright. A paid search API would
work, but the free chain above resolves 11 of 12 companies in a measured run, so
it is not buying much.

Everything degrades rather than fails — an unresolvable company comes back with
nulls and `resolvedVia: "none"`, and the caller shows the aggregator link as it
does today.

### `GET|POST /api/apify`

The paid half of collection: a marketplace of Apify actors, and the runs.

`GET` returns the catalogue the settings page renders. `POST` runs the actors a
user enabled, with **their** token, and returns jobs in the same shape as
`/api/scrape`.

```jsonc
{
  "apifyToken": "apify_api_...",         // required — this spends the user's credit
  "query": "Backend Engineer",
  "countries": ["EG"],
  "worldwide": false,
  "actors": ["apify_wuzzuf", "apify_bayt"],  // optional; omit for the defaults
  "limit": 40
}
```

Separate from `/api/scrape` for a reason that is not tidiness: **this endpoint
spends money.** Keeping it apart makes the rule enforceable rather than
aspirational — nothing scheduled calls it, only the dashboard's Search button
and onboarding do, and the token arrives per request instead of sitting in an
environment variable a cron could reach.

Runs go through `ApifySource`, a `JobSource` like any other, so paid rows get the
same geography filter, remote-eligibility check, description sanitising and
**cross-source dedupe** as the free ones. A user running both Bayt actors — or
Wuzzuf both free and paid — gets one row per job, not three.

| Actor | Default | Cost | Description? |
|---|---|---|---|
| `apify_wuzzuf` — Wuzzuf | **on** | per run | no |
| `apify_bayt` — Bayt | **on** | per run | no |
| `apify_linkedin` — LinkedIn | **on** | $0.0004/result | **yes** |
| `apify_career_sites` — company career pages | **on** | $0.012/job | **yes, HTML** |
| `apify_all_jobs` — 39 sites incl. LinkedIn/Indeed | **on** | per run | **yes** |
| `apify_bayt_memo` — Bayt, detailed | off | $0.0009/result | yes |
| `apify_wuzzuf_alt` — Wuzzuf, alternative | off | per run | no |
| `apify_gulftalent` — GulfTalent | off | **$19.89/month rental** | no |

The defaults are the five that do not overlap each other and do not bill a
subscription. Two things are deliberately loud in the marketplace UI:

- **GulfTalent is a monthly rental, not a per-use charge.** Enabling it by
  default would silently subscribe every user to something most would not use.
- **Four of the seven publish no job description.** Those rows reach the scorer
  as a title and a company name and score accordingly — which reads as the AI
  being bad rather than the source being thin.

`apify_bayt` matters more than its row suggests: it reaches the site the free
`bayt` source cannot, because Apify's residential proxies get past the
Cloudflare fingerprint check that blocks this runtime.

Actors declare their *input* schema and almost none declare their **output**,
so the field names in `mapRow` come from documentation rather than a contract.
When one is renamed, every row maps to an empty title and the source reports a
confident zero — while still billing. `ApifySource` counts unreadable rows and
reports the field names it actually saw, so that surfaces in `meta.actors` as a
named problem instead of an empty market.

**`scripts/apify-probe.ts` validates every actor's input mapping against its
published schema without running anything.** That check is not optional — a
renamed field or a bad enum value fails as an empty run that still bills. It has
already caught two: `searchPostedWithin: "24h"` and `maxJobAge: "1"`, both
silently rejected.

### LinkedIn

**There is no direct LinkedIn scraper here, and there will not be one.**

`linkedin.com/robots.txt` is, in its entirety for anyone unlisted:

```
User-agent: *
Disallow: /
```

Followed by an address to write to for whitelisting. That covers `/jobs/view/`,
`/jobs/search`, the `/jobs-guest/` API and company pages alike. The robots gate
in `lib/http.ts` enforces it without needing to be told — a source that tried
would get `RobotsDisallowed` before a request left the process. That is the
system working, not a gap to route around.

The other two blockers are independent of the first, and each is sufficient on
its own:

- **A real LinkedIn scraper needs the user's LinkedIn password.** The
  Playwright libraries that do this drive a logged-in session; a saved session
  is the account. Storing that is a different risk class from an Apify token —
  a token buys compute, a password is the user's professional identity, their
  messages and their network.
- **Automated access from a logged-in account is what LinkedIn detects and acts
  on**, and the account it restricts is the user's own. Getting someone banned
  from LinkedIn while helping them find a job is worse than not finding them
  the job.

`hiQ v. LinkedIn` is sometimes cited as settling this. It held that scraping
*public* pages is not a CFAA violation; hiQ still lost on breach of contract.
None of it licenses authenticated scraping.

**So LinkedIn comes in through Apify** — `apify_linkedin`, on by default.
Apify's actors run through residential infrastructure and Apify carries that
relationship; the user pays with their own token. It is the cheapest actor in
the catalogue at $0.0004 a result, roughly four cents for a hundred jobs.

Note for anyone reading the old n8n workflow: it hardcoded
`bebity/linkedin-jobs-scraper`, which is a **$29.99/month rental**. For the
volumes this product runs, the actor above costs cents.

### `GET /api/sources`

The catalogue: every source, its kind, geography, language, and whether it is on
by default — with the note explaining why, for the ones that are off.

## Descriptions

Descriptions are stored as **sanitised HTML**, not flattened text.

They used to go through `stripHtml`, which turned a posting's headings and
bullet lists into one unbroken paragraph — and that is what the job drawer
rendered. Storing the source's markup instead would be an XSS hole, since this
is arbitrary HTML from a dozen sites we do not control.

So `src/lib/sanitize.ts` reduces every description at collection time to a small
allowlist — `p br ul ol li strong b em i u h3-h6 blockquote code pre a` — with no
attributes except a scheme-checked `href`. Plain-text descriptions get their
structure rebuilt from newlines and `-`/`•` bullets, so the rows already in the
pool improve too. `truncateHtml` cuts on a tag boundary and closes what is still
open, because slicing HTML at a byte count can leave markup that swallows the
rest of the page.

The app sanitises again before rendering. That is not belt-and-braces for its
own sake: rows collected before this existed, and the n8n workflows, make no
such promise.

`scripts/sanitize-probe.ts` is the check — script tags, event handlers,
`javascript:`/`data:` hrefs, `java\nscript:` evasion, SVG payloads. Run it after
any change to the allowlist.

**It is a hand-rolled allowlist, not DOMPurify.** That is a deliberate trade for
a zero-dependency service, and the probe exists because hand-rolled sanitisers
are historically where bypasses live — it already caught the sanitiser escaping
its own output. If you would rather not carry that risk, run the app-side pass
through `dompurify` in the client component instead.

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
3. Environment variable: `SCRAPER_SECRET` — the only one. See `.env.example`.
   Apify tokens arrive per request because they belong to the user, not the
   deployment, and company enrichment resolves websites for free.

Separate so a slow or blocked source can never consume the user-facing app's
function budget, and so this can be redeployed without touching Jobak.

## What this does not solve

**LinkedIn and Indeed are Apify-only.** The guest-endpoint LinkedIn source was
removed for two reasons: it answered a home connection and refused Vercel's, and
`linkedin.com/robots.txt` is `Disallow: /` regardless — the robots gate would
refuse it now anyway. See the LinkedIn section above. Apify is the honest answer
for both sites, and `apify_linkedin` is on by default.

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

## Compliance, enforced

Every outbound request passes two gates in `lib/http.ts` before it is sent.
Both are ports of ideas from [Scrapling](https://github.com/D4Vinci/Scrapling)'s
crawler, adapted to a latency-bounded serverless function.

**robots.txt** (`lib/robots.ts`) — a minimal RFC 9309 parser: wildcard-group
rules, `*` and `$` patterns, longest-match precedence with `Allow` winning ties.
Fetched once per host per warm instance, and **fail-open** — a robots.txt that
404s or times out means "no rules stated", never "stop collecting".

Only the `User-agent: *` group is read. This service sends a browser
user-agent rather than claiming a product token, so the wildcard group is the
one that binds it; reading a more permissive named group would be helping
ourselves to someone else's allowance.

**Crawl-delay and adaptive throttling** (`lib/throttle.ts`) — a port of
Scrapling's `AutoThrottle`, with the starting delay changed from 5 seconds to
**zero**. A crawler can afford to open politely and speed up; a function with an
18-second budget cannot. So it starts at full speed and only ever slows down on
evidence: a `Crawl-delay` directive, a `Retry-After` header, a 429/403/503, or a
transport failure. Delay converges on `latency / targetConcurrency`, so a slow
host is given room and a fast one is not.

It also never sleeps past its budget — a wait longer than the caller's
`maxWaitMs` is reported as `ThrottledOut` rather than spending time the source
does not have.

### Turning it on found two violations we had been committing

The previous version of this section was a hand-audit, written once and true
once. Enforcing it surfaced both of these on the first run:

- **`remotive.com/api/remote-jobs` is `Disallow: /api/*`.** That source had been
  fetching it every run since it was written. It now reads
  `/remote-jobs/feed`, which is not disallowed — and is the better source
  anyway: dedicated `<company>`, `<location>` and `<type>` elements plus a full
  HTML description, where the API returned one flat blob. The cost is 20 recent
  postings instead of the whole feed.
- **Wikidata disallows `/w/`**, which is where `api.php` lives — the search step
  the company-enrichment resolver depended on. The resolver is gone.
  `query.wikidata.org` disallows `/sparql` too. Dropping it cost nothing
  measurable: the domain guesser resolves the same well-known companies, and
  enrichment still lands 11 of 12.

`scripts/robots-probe.ts` checks every URL this service requests against the
live rules and fails on an unexpected verdict. Both violations above are kept in
it as `deny` expectations, so reaching for those endpoints again fails the
probe.

Two things remain deliberate rather than enforced:

- This service sends a **Chrome user-agent**, as the code it replaces did. It is
  a bot, and a bot identifying itself as Chrome is a choice.
- Wuzzuf and Forasna both `Disallow: /` for **ClaudeBot, GPTBot, CCBot and
  Google-Extended**, and signal `ai-train=no`. Collecting for search and
  reference is what they permit; the descriptions collected here are later sent
  to an LLM for **scoring**, which is retrieval, not training. Not restricted by
  their signal, but close enough to the line to be a conscious call.

## What was taken from Scrapling, and what was not

[Scrapling](https://github.com/D4Vinci/Scrapling) is a Python scraping
framework. It is not a dependency here and could not be — this service is
zero-dependency TypeScript on serverless with no browser — so what follows are
ports of ideas, credited.

**Taken:**

| From Scrapling | Here | Why it fit |
|---|---|---|
| `spiders/throttle.py` — `AutoThrottle` | `lib/throttle.ts` | Repeated probing made three feeds fail at once with `fetch failed`, then recover unaided. That is rate limiting, and nothing here had a concept of it. |
| `spiders/robotstxt.py` — robots gating | `lib/robots.ts` | Turned a hand-audited README section into something that fails loudly. Found two live violations immediately. |
| `spiders/templates/sitemap.py` — recursive index descent | `lib/sitemap.ts` | Wuzzuf discovery named `sitemap-job-1.xml` directly. The `-1` is Wuzzuf saying it intends to shard; a `-2` would have halved coverage with no error. |

**Not taken, and why:**

**AutoMatch / adaptive selectors** — Scrapling's headline feature. It
fingerprints an element (tag, attributes, text, DOM path, parent, siblings) and,
when a selector later fails, re-finds it by scoring every candidate for
similarity. Genuinely clever, and a poor fit here: it needs a real DOM tree and
per-element storage, and it solves "my CSS selector broke" — a problem this
service designs around rather than manages. The parsers deliberately target
structured data that sites maintain for search engines: JSON-LD `JobPosting`,
sitemaps, hydration stores, JSON feeds. Only `forasna.ts` parses cards, and it
is off by default.

**`curl_cffi` TLS impersonation** — this is what would unblock Bayt, and it is
the one thing worth wanting. It is a Python C-extension with no Node equivalent
that runs on Vercel. Tested rather than assumed: `node:https` with Chrome's
cipher order, `X25519:P-256:P-384` curves and a full browser header set still
gets **403 on every Bayt URL**. Cloudflare's check reads TLS extension order and
the HTTP/2 SETTINGS fingerprint, which Node does not expose. Bayt stays off, and
`apify_bayt` remains the way in.

## Working on it

```bash
cd services/scraper
pnpm install --ignore-workspace

npx tsc --noEmit                              # typecheck
npx tsx scripts/probe.ts                      # every source, live, worldwide remote
SCENARIO=mena npx tsx scripts/probe.ts        # Egypt + Saudi + UAE
npx tsx scripts/probe.ts wuzzuf talent        # just these
npx tsx scripts/enrich-probe.ts               # the company-link chain
npx tsx scripts/sanitize-probe.ts             # description sanitiser, incl. XSS vectors
npx tsx scripts/apify-probe.ts                # actor inputs vs published schemas (free)
npx tsx scripts/robots-probe.ts               # every URL we fetch vs the live robots.txt
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
