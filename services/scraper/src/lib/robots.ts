/**
 * robots.txt, enforced rather than documented.
 *
 * The README carries a compliance section listing what each site's robots.txt
 * allows, hand-checked once at the time of writing. That is worth exactly as
 * much as the day it was written on: a site can tighten its rules tomorrow and
 * nothing here would notice. Scrapling gates every request through a robots
 * parser (`spiders/robotstxt.py`, backed by `protego`) rather than trusting a
 * note, and it is right to.
 *
 * So this is a minimal RFC 9309 parser — no dependency, since the service has
 * none — that answers two questions per host: may we fetch this path, and how
 * long must we wait between requests. Both answers feed `lib/http.ts`.
 *
 * The Forasna case is why `Crawl-delay` matters here. Its robots.txt asks for
 * `Crawl-delay: 10`, and the source honours that today only because a comment
 * says "one request per run" and the code happens to agree. Now the delay is
 * read from the site and applied by the fetch layer, so the promise survives
 * someone editing the source.
 *
 * **Fail-open.** A robots.txt that 404s, times out or cannot be parsed means
 * "no rules stated", which is what every crawler and the RFC treat it as. A
 * fetch failure must never silently stop collection.
 */
import type { FetchOptions } from "./http.js";

interface Rule {
    /** Path pattern, possibly containing `*` and a terminal `$`. */
    pattern: string;
    allow: boolean;
}

interface Group {
    rules: Rule[];
    crawlDelayMs: number | null;
}

const EMPTY: Group = { rules: [], crawlDelayMs: null };

/**
 * Parses robots.txt into the rules that apply to `User-agent: *`.
 *
 * Only the wildcard group is read. This service does not claim a product token
 * — it sends a browser user-agent, which is its own decision documented in the
 * README — so the wildcard group is the one that binds it. Reading a more
 * permissive named group would be helping ourselves to someone else's
 * allowance.
 */
export function parseRobots(text: string): Group {
    const rules: Rule[] = [];
    let crawlDelayMs: number | null = null;

    /*
     * A group is one or more consecutive `User-agent` lines followed by their
     * directives. Tracking `inGroup` separately from `matched` is what makes
     * `User-agent: A` / `User-agent: *` / `Disallow: /` bind to us as well —
     * consecutive agent lines share one group.
     */
    let collectingAgents = false;
    let applies = false;

    for (const raw of text.split(/\r?\n/)) {
        const line = raw.split("#")[0].trim();
        if (!line) continue;

        const separator = line.indexOf(":");
        if (separator === -1) continue;

        const field = line.slice(0, separator).trim().toLowerCase();
        const value = line.slice(separator + 1).trim();

        if (field === "user-agent") {
            // A new group starts at the first agent line after any directive.
            if (!collectingAgents) {
                collectingAgents = true;
                applies = false;
            }
            if (value === "*") applies = true;
            continue;
        }

        collectingAgents = false;
        if (!applies) continue;

        switch (field) {
            case "disallow":
                // An empty Disallow means "nothing is disallowed" — it is an
                // allow-all, not a block-all, and reading it the other way
                // would stop collection everywhere.
                if (value) rules.push({ pattern: value, allow: false });
                break;
            case "allow":
                if (value) rules.push({ pattern: value, allow: true });
                break;
            case "crawl-delay": {
                const seconds = Number(value);
                if (Number.isFinite(seconds) && seconds > 0) {
                    crawlDelayMs = Math.max(crawlDelayMs ?? 0, seconds * 1000);
                }
                break;
            }
        }
    }

    return { rules, crawlDelayMs };
}

/**
 * Whether a group permits a path.
 *
 * RFC 9309: the most specific rule wins, measured by pattern length, and
 * `Allow` beats `Disallow` on a tie. That tie-break is what makes Bayt's
 * `Disallow: /en/jobs/*-jobs/` alongside its country paths resolve correctly.
 */
export function isAllowed(group: Group, path: string): boolean {
    let best: Rule | null = null;

    for (const rule of group.rules) {
        if (!matches(rule.pattern, path)) continue;
        if (
            best === null ||
            rule.pattern.length > best.pattern.length ||
            (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
        ) {
            best = rule;
        }
    }

    return best === null ? true : best.allow;
}

/** robots.txt patterns support `*` as any-run and a terminal `$` as end-anchor. */
function matches(pattern: string, path: string): boolean {
    const anchored = pattern.endsWith("$");
    const body = anchored ? pattern.slice(0, -1) : pattern;

    const escaped = body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}${anchored ? "$" : ""}`).test(path);
}

/* ────────────────────────────────────────────────────────────────────────── */

type Fetcher = (url: string, signal: AbortSignal, options?: FetchOptions) => Promise<string>;

/**
 * One robots.txt per host, remembered for as long as the instance lives.
 *
 * Module scope, like the throttle: a warm Lambda reuses it, so the cost is one
 * extra request per host per cold start rather than per source run.
 */
const cache = new Map<string, Group>();
const inFlight = new Map<string, Promise<Group>>();

export async function robotsFor(url: string, signal: AbortSignal, fetcher: Fetcher): Promise<Group> {
    let origin: string;
    let host: string;
    try {
        const parsed = new URL(url);
        origin = parsed.origin;
        host = parsed.host;
    } catch {
        return EMPTY;
    }

    const cached = cache.get(host);
    if (cached) return cached;

    // Ten detail-page fetches starting at once must not become ten robots.txt
    // fetches; they all wait on the first.
    const pending = inFlight.get(host);
    if (pending) return pending;

    const task = (async (): Promise<Group> => {
        try {
            const text = await fetcher(`${origin}/robots.txt`, signal, {
                timeoutMs: 4_000,
                skipRobots: true,
            });
            return parseRobots(text);
        } catch {
            // 404, timeout, connection refused — all mean "no rules stated".
            return EMPTY;
        }
    })();

    inFlight.set(host, task);
    try {
        const group = await task;
        cache.set(host, group);
        return group;
    } finally {
        inFlight.delete(host);
    }
}

/** Cached rules only — used where an extra request would not be worth it. */
export function cachedRobots(host: string): Group | null {
    return cache.get(host) ?? null;
}

export class RobotsDisallowed extends Error {
    constructor(url: string) {
        super(`robots.txt disallows ${url}`);
        this.name = "RobotsDisallowed";
    }
}
