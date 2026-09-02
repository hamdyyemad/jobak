/**
 * Every outbound request in this service goes through here.
 *
 * Centralised because the detail-page strategies changed the traffic shape: the
 * old adapters made one request per source, so a bare `fetch` was fine. Wuzzuf
 * and Bayt fan out to dozens of detail pages per search, which needs bounded
 * concurrency and a wall-clock budget or a single source eats the whole
 * function timeout.
 */

import type { Transport } from "../core/types.js";
import { isAllowed, robotsFor, RobotsDisallowed } from "./robots.js";
import { isBlockedStatus, parseRetryAfter, throttle } from "./throttle.js";

export const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * The stealth transport: `services/browser`, if it is deployed.
 *
 * Both must be set or the transport does not exist, and a source that asked for
 * it skips itself rather than falling back to `fetch` — falling back would just
 * spend the timeout collecting 403s, which is the exact failure this replaces.
 */
const BROWSER_URL = process.env.BROWSER_URL?.replace(/\/+$/, "");
const BROWSER_SECRET = process.env.BROWSER_SECRET;

export function stealthAvailable(): boolean {
    return Boolean(BROWSER_URL && BROWSER_SECRET);
}

export interface FetchOptions {
    headers?: Record<string, string>;
    /** Per-request cap, independent of the source-wide signal. */
    timeoutMs?: number;
    /**
     * Which client sends this request. Defaults to `fetch` — this runtime.
     *
     * `stealth` hands it to `services/browser` instead. See `stealthFetch`.
     */
    transport?: Transport;
    /** Defaults to GET. Apify actor runs are the only POSTs this service makes. */
    method?: "GET" | "POST";
    body?: string;
    /**
     * Skip the robots.txt check.
     *
     * For the robots.txt fetch itself, which would otherwise recurse, and for
     * Apify's API — a service we are a paying client of, not a site we crawl.
     */
    skipRobots?: boolean;
    /**
     * How long this caller can afford to wait for politeness.
     *
     * The throttle would rather wait than be refused, but a source with four
     * seconds of budget left cannot spend ten of them sleeping. Past this, the
     * request is abandoned instead — see `ThrottledOut`.
     */
    maxWaitMs?: number;
}

/**
 * Aborts on either the caller's signal or this request's own timeout.
 *
 * `AbortSignal.any` would say this in one line, but a single slow detail page
 * must not be able to consume the budget the rest of the fan-out is sharing,
 * and the per-request timer is what guarantees that.
 */
function linkSignals(outer: AbortSignal, timeoutMs?: number): { signal: AbortSignal; done: () => void } {
    if (!timeoutMs) return { signal: outer, done: () => {} };

    const controller = new AbortController();
    const abort = () => controller.abort(outer.reason);
    if (outer.aborted) abort();
    outer.addEventListener("abort", abort, { once: true });

    const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    return {
        signal: controller.signal,
        done: () => {
            clearTimeout(timer);
            outer.removeEventListener("abort", abort);
        },
    };
}

/**
 * Removes credentials from a URL before it goes into an error message.
 *
 * Apify takes its token as a query parameter, and errors from this service end
 * up in n8n's execution log and in `collection_runs.detail` — both of which are
 * places a user's API token must never be written.
 */
function redact(url: string): string {
    return url.replace(/([?&](?:token|api_?key|secret)=)[^&]*/gi, "$1***");
}

/** Raised when honouring a host's pace would cost more time than the caller has. */
export class ThrottledOut extends Error {
    constructor(host: string, waitMs: number, budgetMs: number) {
        super(`${host} wants ${Math.round(waitMs)}ms of politeness, budget is ${Math.round(budgetMs)}ms`);
        this.name = "ThrottledOut";
    }
}

const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(signal.reason ?? new Error("aborted"));
            },
            { once: true }
        );
    });

/**
 * The same request, sent by a client whose TLS handshake is Chrome's.
 *
 * Cloudflare decides against undici before a header is read: measured against
 * tls.peet.ws, this runtime offers a 10-cipher list with no GREASE over
 * HTTP/1.1, and Bayt answers every path with a 5KB "Attention Required" page.
 * The browser service presents GREASE, X25519MLKEM768, ALPS/ECH and HTTP/2 —
 * and Bayt answers it with the 214KB listing and its `ItemList` intact.
 *
 * The result is wrapped in a real `Response` so everything downstream — the
 * throttle, the error shape, the redaction — stays identical to the plain path.
 * The status is inferred rather than observed: obscura exits 0 whatever the
 * origin said and prints no status line, so the service reports `blocked`, and
 * 403 is the status the throttle already backs off from.
 */
async function stealthFetch(url: string, signal: AbortSignal, options: FetchOptions): Promise<Response> {
    const relay = await fetch(`${BROWSER_URL}/fetch`, {
        signal,
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${BROWSER_SECRET}` },
        body: JSON.stringify({ url, timeoutMs: options.timeoutMs ?? 20_000, userAgent: UA }),
    });

    if (!relay.ok) {
        // The relay's own failure, not the origin's. A 503 here means it is at
        // its concurrency ceiling, which the throttle should read as a block.
        return new Response("", { status: relay.status, statusText: `browser service: ${relay.statusText}` });
    }

    const payload = (await relay.json()) as { blocked: boolean; body: string; error: string | null };
    if (payload.error) throw new Error(`browser service — ${redact(url)} — ${payload.error}`);
    return payload.blocked
        ? new Response(payload.body, { status: 403, statusText: "Blocked" })
        : new Response(payload.body, { status: 200, statusText: "OK" });
}

export async function fetchText(url: string, signal: AbortSignal, options: FetchOptions = {}): Promise<string> {
    const host = (() => {
        try {
            return new URL(url).host;
        } catch {
            return "";
        }
    })();

    /*
     * ── Politeness, before the request rather than after the refusal ──
     *
     * Two gates, both ported from Scrapling's crawler: what the site's
     * robots.txt permits, and how fast it has shown it wants to be hit. Neither
     * existed before, which is why repeated probing could make three feeds fail
     * at once with `fetch failed` and then recover on their own.
     */
    let floorMs = 0;

    if (host && !options.skipRobots) {
        const group = await robotsFor(url, signal, fetchText);
        const path = new URL(url).pathname + new URL(url).search;

        if (!isAllowed(group, path)) throw new RobotsDisallowed(redact(url));
        floorMs = group.crawlDelayMs ?? 0;

        const waitMs = throttle.waitFor(host);
        if (waitMs > 0) {
            const budget = options.maxWaitMs ?? 8_000;
            if (waitMs > budget) throw new ThrottledOut(host, waitMs, budget);
            await sleep(waitMs, signal);
        }
        throttle.reserve(host, floorMs);
    }

    const { signal: linked, done } = linkSignals(signal, options.timeoutMs);
    const started = Date.now();

    try {
        const res =
            options.transport === "stealth"
                ? await stealthFetch(url, linked, options)
                : await fetch(url, {
                      signal: linked,
                      redirect: "follow",
                      method: options.method ?? "GET",
                      body: options.body,
                      headers: {
                          "User-Agent": UA,
                          Accept: "*/*",
                          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
                          ...options.headers,
                      },
                  });

        if (host && !options.skipRobots) {
            // Latency is the host's own signal about how much load it is under;
            // a block is its explicit one. Both feed the next request's pace.
            throttle.record(
                host,
                Date.now() - started,
                res.ok || !isBlockedStatus(res.status),
                floorMs,
                parseRetryAfter(res.headers)
            );
        }

        if (!res.ok) {
            /*
             * The status alone is not enough to act on for Apify: a 402 means
             * the user is out of credit and a 404 means the actor was renamed,
             * and those need different messages. The body carries which.
             */
            const detail = await res.text().catch(() => "");
            const hint = detail.slice(0, 200).replace(/\s+/g, " ").trim();
            throw new Error(`${res.status} ${res.statusText} — ${redact(url)}${hint ? ` — ${hint}` : ""}`);
        }
        return await res.text();
    } catch (error) {
        // A transport failure — connection reset, DNS, the shape rate limiting
        // usually takes — counts as a block, so the next request backs off.
        if (host && !options.skipRobots && !(error instanceof RobotsDisallowed)) {
            throttle.record(host, Date.now() - started, false, floorMs);
        }
        throw error;
    } finally {
        done();
    }
}

export async function fetchJson<T>(url: string, signal: AbortSignal, options: FetchOptions = {}): Promise<T> {
    const body = await fetchText(url, signal, {
        ...options,
        headers: { Accept: "application/json", ...options.headers },
    });
    return JSON.parse(body) as T;
}

/**
 * A fetch whose failure is a `null`, not a throw.
 *
 * The right default for anything fanning out: one detail page 404ing, or one
 * company site refusing a datacenter IP, should cost that row and nothing else.
 */
export async function tryFetchText(
    url: string,
    signal: AbortSignal,
    options: FetchOptions = {}
): Promise<string | null> {
    try {
        return await fetchText(url, signal, options);
    } catch {
        return null;
    }
}

/**
 * `Promise.all` with a ceiling on how many run at once.
 *
 * Fan-out without this is how you get rate-limited: 60 simultaneous requests to
 * one host reads as an attack, and the host is right. Six at a time finishes a
 * page of detail fetches in about a second and looks like a browser.
 */
export async function mapLimit<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const out = new Array<R>(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        for (;;) {
            const index = cursor++;
            if (index >= items.length) return;
            out[index] = await worker(items[index], index);
        }
    });

    await Promise.all(runners);
    return out;
}

/**
 * A wall-clock allowance shared across a fan-out.
 *
 * A source that discovers 200 detail pages must stop fetching when its slice of
 * the function budget is gone and return what it has. Returning 30 jobs beats
 * returning a platform timeout.
 */
export class Budget {
    private readonly deadline: number;

    constructor(ms: number) {
        this.deadline = Date.now() + ms;
    }

    get expired(): boolean {
        return Date.now() >= this.deadline;
    }

    get remainingMs(): number {
        return Math.max(0, this.deadline - Date.now());
    }
}
