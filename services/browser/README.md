# jobak-browser

One thing: fetch a URL with a client whose TLS handshake is Chrome's, and
return the bytes. It exists so `services/scraper` can read Bayt.

## Why it exists

Cloudflare rejects the *runtime*, not the request. The scraper runs on undici,
and Bayt answers it with a 403 "Attention Required" on every path — listing
pages, detail pages, `sitemap.xml`. No header, user-agent or delay changes that,
because it is decided from the ClientHello before a header is read.

Measured against `tls.peet.ws`, this is what the three clients look like:

| Client | JA4 | GREASE | HTTP | Bayt |
|---|---|---|---|---|
| Node `fetch` (undici) | — | no | 1.1 | **403**, 5,482 bytes |
| `obscura` default build, `--stealth` | `t13d1011h1_61a7ad8aa9b6_…` | no | 1.1 | **403**, 5,482 bytes |
| `obscura` **stealth build**, `--stealth` | `t13d1516h2_8daaf6152771_…` | yes | 2 | **200**, ~214,000 bytes |

The middle row is the trap. **The public `h4ckf0r0day/obscura` image on Docker
Hub is compiled without the `stealth` cargo feature**, and there `--stealth`
only reorders ClientHello extensions — JA4 is byte-identical to the plain build,
because JA4 sorts extensions. It looks like it is doing something and it is not.
Only the release archives with `-stealth` in the name carry the wreq/BoringSSL
transport, and those present a real Chrome handshake: GREASE, X25519MLKEM768
(4588), ALPS and ECH, HTTP/2 with Chrome's own SETTINGS frame.

So the Dockerfile pins a release asset and verifies its SHA-256. A build that
quietly fell back to the Docker Hub image would pass every smoke test that does
not involve Cloudflare and then collect nothing.

## This is not a browser

`--dump original` bypasses obscura's V8 and rendering layers entirely — it is an
HTTP GET wearing Chrome's fingerprint. That is the whole of what the scraper was
missing, and it is why the image uses the `no-render` binary and idles at 28 MB.

Nothing here needs a rendered DOM. Every MENA board the scraper reads publishes
its JSON-LD server-side, because that is what Google indexes; `DetailPageStrategy`
was built on exactly that observation. If a source ever does need real
rendering, swap `obscura-x86_64-linux-no-render-stealth.tar.gz` for
`obscura-x86_64-linux-stealth.tar.gz` in the Dockerfile and use `--dump html`.

## API

`GET /health` — unauthenticated, so a platform health check can reach it.

`POST /fetch` — `Authorization: Bearer $BROWSER_SECRET`

```jsonc
// →
{ "url": "https://www.bayt.com/en/egypt/jobs/backend-engineer-jobs/", "timeoutMs": 20000 }
// ←
{ "ok": true, "blocked": false, "bytes": 214007, "elapsedMs": 963, "error": null, "body": "<!DOCTYPE html>…" }
```

### `status` is inferred, not observed

Obscura's CLI exits 0 whatever the origin answered and `--dump original` prints
no status line — verified against httpbin 403 and 404, which both come back as
exit 0 with zero bytes. Batch mode (`fetch --file`) *does* report a status, but
discards the body, so it cannot be used to get both.

Hence `blocked`, which is a body heuristic: an empty response, or a small one
carrying Cloudflare's markers. That is enough for the one thing the caller does
with it — the scraper's throttle only asks "was this a block?" — and
`stealthFetch` in `services/scraper/src/lib/http.ts` turns it back into a 403
so the adaptive delay still converges. It is a real gap and worth an upstream
issue; it is not a blocker.

## Configuration

| Variable | Default | |
|---|---|---|
| `BROWSER_SECRET` | *(none)* | Required. Every `/fetch` 500s until it is set. |
| `ALLOWED_HOSTS` | `bayt.com` | Comma-separated. Matches the host or any subdomain. |
| `PORT` | `7860` | |
| `MAX_CONCURRENCY` | `4` | Requests beyond this get a 503 rather than a queue. |

**`ALLOWED_HOSTS` is not optional in spirit.** The URL is caller-supplied, so
without it this is an open proxy that happens to defeat bot detection — an abuse
magnet, and the fastest way to lose whatever account hosts it. Obscura already
refuses loopback and RFC1918 by default; the allowlist is the second gate.

## Deploying it

Any host that runs a container and gives it a public URL. It listens on `$PORT`,
binds `0.0.0.0`, and runs as uid 1000 (the base image's `node` user — note that
`useradd -u 1000` *fails* on this image, which is the trap in Hugging Face's own
Dockerfile example).

```
docker build -t jobak-browser .
docker run -d -p 7860:7860 -e BROWSER_SECRET=… -e ALLOWED_HOSTS=bayt.com jobak-browser
```

Then, on the scraper's Vercel project:

```
BROWSER_URL=https://…
BROWSER_SECRET=…        # the same value
```

Bayt turns itself on when both are present and skips itself with a reason when
they are not — see `accepts()` in `src/sources/mena/bayt.ts`. There is no
fallback to plain `fetch`, deliberately: falling back would spend the source's
whole budget collecting 403s.

### Not Hugging Face Spaces

Spaces was the obvious candidate — free, Docker-native, one file. But HF's
[content policy](https://huggingface.co/content-guidelines) prohibits, under
Platform Abuse, "using tools like Cloudflare Tunnel, TOR, proxies … to bypass
restrictions". A TLS-impersonating relay whose stated purpose is getting past a
Cloudflare gate is squarely that, whatever it is called. It would likely run
fine and be removable without notice, taking a source with it.

A container host that sells general compute — Fly.io, Railway, Render, or a
small VPS — is both cheaper to reason about and not a policy violation.

### The untested variable: datacenter IP

Every measurement in this README was taken from a **residential IP in the
region Bayt serves**. That is the friendliest possible case, and this repo has
already been burned by the difference: the LinkedIn guest endpoint "answered a
home connection and refused Vercel's".

Cloudflare scores IP reputation alongside the fingerprint, so a correct
handshake from a datacenter range may still be refused. **Deploy, then re-run
`SCENARIO=mena npx tsx scripts/probe.ts bayt` against the deployed URL before
trusting any of this.** That probe is the acceptance test, not the local
numbers.

## Pace

The transport gets past the fingerprint gate. It does not buy a bigger
allowance, and Bayt's rate limiting is real — measured live from one IP:

| Pattern | Result |
|---|---|
| 6 concurrent detail fetches | 2 of 6 |
| 6 concurrent again, immediately | **0 of 6** |
| sequential, 2s gap (after 90s cooldown) | 6 of 6 |
| 2 concurrent, 3s gap between pairs | 6 of 6 |

Blocks are per-path and transient rather than a lasting IP ban. In one
three-URL discovery pass, Egypt and the UAE were refused while Saudi returned
229 KB; a minute later Egypt answered and the others did not. So a retry is
usually worth more than a backoff, and `JsonLdBoard.discover` attempts every
market and reports a failure only when all of them refuse — letting the first
403 throw would discard the markets that would have answered.

`JsonLdBoard` also caps the stealth path at concurrency 2, which costs Bayt most
of its 9-second fan-out budget. Consecutive probe runs returned 8, then 0, then
6 kept jobs. **A run returning 0 is normal here, not a fault** — which is the
argument for keeping Bayt as one source among thirteen rather than anything the
collector depends on.
