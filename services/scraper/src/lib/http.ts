/**
 * Every outbound request in this service goes through here.
 *
 * Centralised because the detail-page strategies changed the traffic shape: the
 * old adapters made one request per source, so a bare `fetch` was fine. Wuzzuf
 * and Bayt fan out to dozens of detail pages per search, which needs bounded
 * concurrency and a wall-clock budget or a single source eats the whole
 * function timeout.
 */

export const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface FetchOptions {
    headers?: Record<string, string>;
    /** Per-request cap, independent of the source-wide signal. */
    timeoutMs?: number;
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

export async function fetchText(url: string, signal: AbortSignal, options: FetchOptions = {}): Promise<string> {
    const { signal: linked, done } = linkSignals(signal, options.timeoutMs);
    try {
        const res = await fetch(url, {
            signal: linked,
            redirect: "follow",
            headers: {
                "User-Agent": UA,
                Accept: "*/*",
                "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
                ...options.headers,
            },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
        return await res.text();
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
