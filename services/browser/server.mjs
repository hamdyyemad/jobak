/**
 * A TLS-impersonating fetch, behind a bearer token.
 *
 * This exists for exactly one reason: Cloudflare rejects the *runtime*, not the
 * request. `services/scraper` runs on undici, whose TLS ClientHello is not a
 * browser's, and Bayt — the broadest MENA source there is — answers it with a
 * 403 before a single header is read. Obscura's stealth build presents a real
 * Chrome ClientHello (GREASE, X25519MLKEM768, ALPS/ECH, HTTP/2), and Bayt
 * answers *that* with the same 214KB of JSON-LD it gives a browser.
 *
 * So this is not a browser service. `--dump original` bypasses obscura's V8 and
 * rendering layers entirely: it is an HTTP GET wearing Chrome's fingerprint,
 * which is the whole of what the scraper was missing. Rendering stays available
 * (swap the no-render binary for the full one) but nothing needs it today —
 * every MENA board here publishes its JSON-LD server-side, for Google's sake.
 */

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { URL } from "node:url";

const PORT = Number(process.env.PORT ?? 7860);
const SECRET = process.env.BROWSER_SECRET ?? "";
const BIN = process.env.OBSCURA_BIN ?? "/usr/local/bin/obscura";
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY ?? 4);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 8 * 1024 * 1024);
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Only these hosts, and never a bare "any host".
 *
 * A Space is world-reachable and the URL is caller-supplied, so without this the
 * endpoint is an open proxy that happens to defeat bot detection — which is
 * both an abuse magnet and, on someone else's free tier, a good way to lose the
 * account. Obscura already refuses loopback and RFC1918 (its `--allow-private-
 * network` default), so this is the second gate, not the only one.
 */
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? "bayt.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

function hostAllowed(hostname) {
    const host = hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

let inFlight = 0;

/**
 * Obscura's exit code is 0 whatever the origin answered, and `--dump original`
 * prints the body with no status line — verified against httpbin 403/404, which
 * come back as exit 0 and zero bytes. So the status a caller gets from here is
 * inferred, not observed: a body means the origin served one.
 *
 * That is enough for the one thing the scraper does with it. Its throttle only
 * asks "was this a block?", and a Cloudflare interstitial is unmistakable — a
 * ~5KB page titled "Attention Required" where a real listing is 100KB+. The
 * blocked flag below is what feeds that back, so the adaptive delay still
 * converges even though the numeric status is gone.
 */
function looksBlocked(body) {
    if (body.length === 0) return true;
    if (body.length > 50_000) return false;
    return /Attention Required|cf-error-details|Cloudflare Ray ID|__cf_chl/i.test(body);
}

function runObscura(url, timeoutMs, userAgent) {
    const args = ["--stealth", "fetch", url, "--dump", "original", "-q", "--timeout", String(Math.ceil(timeoutMs / 1000))];
    if (userAgent) args.push("--user-agent", userAgent);

    return new Promise((resolve) => {
        const started = Date.now();
        execFile(
            BIN,
            args,
            { timeout: timeoutMs + 5_000, maxBuffer: MAX_BODY_BYTES, encoding: "utf8" },
            (error, stdout) => {
                const body = stdout ?? "";
                resolve({
                    body,
                    elapsedMs: Date.now() - started,
                    error: error ? String(error.message ?? error).slice(0, 300) : null,
                });
            }
        );
    });
}

function send(res, code, payload) {
    const json = JSON.stringify(payload);
    res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(json) });
    res.end(json);
}

async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 * 1024) throw new Error("request body too large");
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
    // Unauthenticated on purpose: this is what the Space's own health check hits,
    // and it reveals nothing but liveness.
    if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
        return send(res, 200, { ok: true, hosts: ALLOWED_HOSTS, inFlight });
    }

    if (req.method !== "POST" || !req.url?.startsWith("/fetch")) {
        return send(res, 404, { error: "not found" });
    }

    if (!SECRET) return send(res, 500, { error: "BROWSER_SECRET is not configured" });
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${SECRET}`) return send(res, 401, { error: "unauthorized" });

    let payload;
    try {
        payload = JSON.parse(await readBody(req));
    } catch (e) {
        return send(res, 400, { error: `bad request: ${e.message}` });
    }

    let target;
    try {
        target = new URL(payload.url);
    } catch {
        return send(res, 400, { error: "url is not parseable" });
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
        return send(res, 400, { error: "only http(s) is fetchable" });
    }
    if (!hostAllowed(target.hostname)) {
        return send(res, 403, { error: `host not allowed: ${target.hostname}`, allowed: ALLOWED_HOSTS });
    }

    /*
     * Refuse rather than queue. The caller is a Vercel function with a hard
     * 60-second ceiling and its own budget accounting; a request parked behind
     * three others helps nobody, and a 503 is something its throttle already
     * knows how to read.
     */
    if (inFlight >= MAX_CONCURRENCY) {
        return send(res, 503, { error: "busy", inFlight, max: MAX_CONCURRENCY });
    }

    inFlight++;
    try {
        const timeoutMs = Math.min(Number(payload.timeoutMs) || DEFAULT_TIMEOUT_MS, 45_000);
        const result = await runObscura(target.toString(), timeoutMs, payload.userAgent);
        const blocked = looksBlocked(result.body);

        send(res, 200, {
            ok: !blocked && !result.error,
            blocked,
            bytes: Buffer.byteLength(result.body),
            elapsedMs: result.elapsedMs,
            error: result.error,
            body: result.body,
        });
    } finally {
        inFlight--;
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`browser service on :${PORT} — hosts=${ALLOWED_HOSTS.join(",")} concurrency=${MAX_CONCURRENCY}`);
    if (!SECRET) console.warn("WARNING: BROWSER_SECRET unset — every /fetch will 500 until it is.");
});
