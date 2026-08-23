/**
 * Per-host politeness, learned from what the host actually does.
 *
 * Ported from Scrapling's `AutoThrottle` (scrapling/spiders/throttle.py), with
 * one important change of default. Scrapling is a crawler: it starts at a
 * 5-second delay and speeds up if the host tolerates it. This service is a
 * serverless function with an 18-second budget per source, so it starts at
 * **zero** and only ever slows down on evidence — a `Crawl-delay` in robots.txt,
 * a 429, a `Retry-After`, or a run of failures.
 *
 * The problem it solves is real and was measured here: probing the same feeds
 * repeatedly made remotive, weworkremotely and jobicy all fail at once with
 * `fetch failed`, then succeed on their own a minute later. That is rate
 * limiting, and the previous code had no concept of it — every run hit every
 * host as fast as it could and treated the resulting failure as the source
 * being broken.
 *
 * The other adaptation: this never sleeps past its budget. A crawler can afford
 * to wait sixty seconds; a request that must answer in eighteen cannot, so a
 * delay longer than the time remaining is reported as a skip instead.
 */

/**
 * Statuses that mean "you are being refused", not "that page does not exist".
 *
 * Same set Scrapling uses. 404 is deliberately absent — a missing detail page
 * is ordinary during a sitemap fan-out and must not slow the whole host down.
 */
const BLOCKED_STATUSES = new Set([401, 403, 407, 429, 444, 500, 502, 503, 504]);

const BLOCK_BACKOFF_FACTOR = 2;

export interface ThrottleOptions {
    /** Delay for the first request to a host. Zero: assume goodwill until shown otherwise. */
    startDelayMs?: number;
    /** Ceiling, however hostile the host turns out to be. */
    maxDelayMs?: number;
    /** How many requests we aim to have in flight per host. */
    targetConcurrency?: number;
}

export function isBlockedStatus(status: number): boolean {
    return BLOCKED_STATUSES.has(status);
}

/**
 * `Retry-After`, in milliseconds, or null when absent or unreadable.
 *
 * The header is either a number of seconds or an HTTP date, and both are seen
 * in the wild. Honouring it is the difference between backing off for the four
 * seconds a host asked for and backing off for the sixty our own doubling would
 * have chosen.
 */
export function parseRetryAfter(headers: Headers): number | null {
    const value = headers.get("retry-after")?.trim();
    if (!value) return null;

    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(seconds, 0) * 1000;

    const date = Date.parse(value);
    if (!Number.isNaN(date)) return Math.max(date - Date.now(), 0);

    return null;
}

export class AutoThrottle {
    private readonly startDelayMs: number;
    private readonly maxDelayMs: number;
    private readonly targetConcurrency: number;

    /** Learned delay per host. */
    private readonly delays = new Map<string, number>();
    /** When each host may next be hit. */
    private readonly nextAllowed = new Map<string, number>();

    constructor(options: ThrottleOptions = {}) {
        this.startDelayMs = options.startDelayMs ?? 0;
        this.maxDelayMs = options.maxDelayMs ?? 15_000;
        this.targetConcurrency = Math.max(options.targetConcurrency ?? 4, 0.1);
    }

    delayFor(host: string, floorMs = 0): number {
        const existing = this.delays.get(host);
        if (existing !== undefined) return Math.max(existing, floorMs);

        const initial = Math.min(Math.max(floorMs, this.startDelayMs), this.maxDelayMs);
        this.delays.set(host, initial);
        return initial;
    }

    /**
     * How long this host wants us to wait right now.
     *
     * Returns the *remaining* wait rather than the configured delay, so a host
     * that was last hit two seconds into a three-second delay is only owed one
     * more second.
     */
    waitFor(host: string): number {
        const ready = this.nextAllowed.get(host);
        if (ready === undefined) return 0;
        return Math.max(0, ready - Date.now());
    }

    /** Records that a request is going out now, reserving the host's next slot. */
    reserve(host: string, floorMs = 0): void {
        const delay = this.delayFor(host, floorMs);
        this.nextAllowed.set(host, Date.now() + delay);
    }

    /**
     * Feeds a finished request back in, and returns the host's new delay.
     *
     * The delay converges on `latency / targetConcurrency`, so a fast host is
     * hit harder and a slow one is given room — the throttle reads latency as
     * the host's own signal about how much load it is under. A block can only
     * ever slow things down, never speed them up.
     */
    record(
        host: string,
        latencyMs: number,
        ok: boolean,
        floorMs = 0,
        retryAfterMs: number | null = null
    ): number {
        const current = this.delayFor(host, floorMs);
        const target = latencyMs / this.targetConcurrency;

        let next = Math.max((current + target) / 2, target);

        if (!ok) {
            const penalty = retryAfterMs ?? Math.max(current, 250) * BLOCK_BACKOFF_FACTOR;
            next = Math.max(next, penalty, current);
        }

        next = Math.min(Math.max(next, floorMs), this.maxDelayMs);
        this.delays.set(host, next);
        return next;
    }

    /** Everything the throttle has learned, for reporting. */
    snapshot(): Record<string, number> {
        return Object.fromEntries(this.delays);
    }
}

/**
 * Shared across a warm Lambda invocation.
 *
 * Module scope on purpose: Vercel reuses a warm instance for consecutive runs,
 * so a host that rate-limited us on the last request is still known to be
 * touchy on the next one. A cold start forgets, which is the correct default —
 * a new instance has no evidence either way.
 */
export const throttle = new AutoThrottle();
