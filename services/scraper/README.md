# jobak-scraper

Job collection for Jobak. One endpoint, eleven sources, no per-request cost.

Built to replace most of what Apify was doing. Apify's bill buys residential
proxies and hosted browsers — necessary for LinkedIn and Indeed, and complete
overkill for the eight sources below that publish a free JSON or RSS feed and
want it consumed.

## Deploying

A **separate Vercel project** from the main app, pointed at this directory:

1. New Project → same repository → **Root Directory: `services/scraper`**
2. Framework preset: **Other** (the `api/` folder is picked up automatically)
3. Environment variable: `SCRAPER_SECRET` — see `.env.example`

Separate so a slow or blocked source can never consume the user-facing app's
function budget, and so this can be redeployed without touching Jobak.

## Endpoints

Both require `x-scraper-secret`.

### `POST /api/scrape`

```jsonc
{
  "query": "Backend Engineer",           // required
  "countries": ["EG", "AE"],             // or [{ "code": "EG", "name": "Egypt" }]
  "worldwide": false,
  "workPreference": ["remote", "on-site"],
  "limit": 25,                           // per source, max 100
  "sources": ["remoteok", "wuzzuf"],     // optional; omit for the defaults
  "ats": { "greenhouse": ["stripe"], "ashby": ["ramp"] }
}
```

Returns `{ jobs, meta }`. `jobs` are already in the shape the `jobs` table
expects — the n8n workflow inserts them without a normalizer.

`meta.sources` reports every source's outcome individually, so a run that lost
LinkedIn is visibly different from a run where LinkedIn found nothing.

### `GET /api/sources`

The catalogue: every source, its kind, its geography, and whether it is on by
default.

## The sources

| Key | Kind | Geography | Notes |
|---|---|---|---|
| `remoteok` | JSON | remote-only | ~100 latest postings |
| `remotive` | JSON | remote-only | Small feed; `?search=` is accepted and ignored |
| `arbeitnow` | JSON | company | Europe-weighted, paginated, double-encoded HTML |
| `jobicy` | JSON | remote-only | `?count=` works; `?tag=` does not |
| `himalayas` | JSON | remote-only | ~20 latest, rotates quickly |
| `weworkremotely` | RSS | remote-only | Company and title share one field |
| `wuzzuf` | HTML | Egypt | Public `/a/` route; `/search/jobs/` is Cloudflare-protected |
| `linkedin` | HTML | any | Guest endpoint. **Best-effort — see below** |
| `greenhouse` | JSON | company | Needs slugs via `ats` |
| `ashby` | JSON | company | Needs slugs via `ats` |
| `workable` | JSON | company | Needs slugs via `ats` |

The ATS sources are the highest-quality listings available anywhere — first
party, full descriptions, always current — and completely free. The catch is
that you must know which companies to ask, so build a slug list over time.

## What this does not solve

**LinkedIn and Indeed want residential IPs.** The guest endpoint answers a home
connection readily and refuses datacenter ranges far more often; Indeed returns
403 to plain HTTP clients regardless. Expect `linkedin` to report zero from
Vercel and treat anything it does return as a bonus. Indeed is not implemented
for that reason — Apify remains the honest answer for those two.

**No browser.** Everything here is `fetch` plus parsing. Chromium does not fit
Vercel's bundle limits comfortably and its cold starts eat the function budget,
so any source needing JavaScript execution is out of scope by design.

**Feeds are "latest N", not searchable archives.** None of these APIs support
server-side search, so the query is applied here against a few hundred recent
postings. That suits a matcher that runs regularly and catches new listings; it
is not a way to search history.

## Working on it

```bash
pnpm install --ignore-workspace
npx tsc --noEmit                      # typecheck
npx tsx scripts/probe.ts              # every source, live, worldwide remote
SCENARIO=country npx tsx scripts/probe.ts   # country search + geography filter
npx tsx scripts/probe.ts wuzzuf linkedin    # just these
```

`probe.ts` is the check that matters. These adapters depend on contracts living
on other people's servers, so compiling proves very little — run it after any
adapter change, and first whenever a source starts returning zero in
production. It fails the process on any field-level integrity problem
(unparseable date, HTML left in a description, bad `job_type`), because those
are what break the bulk insert downstream.
