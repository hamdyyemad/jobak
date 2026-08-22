import type { ScrapedJob, ScrapeParams, SourceAdapter, SourceResult } from "../types.js";
import { dedupe } from "../normalize.js";
import { inCountry } from "../geo.js";
import {
    arbeitnow,
    ashby,
    greenhouse,
    himalayas,
    jobicy,
    linkedin,
    remoteok,
    remotive,
    weworkremotely,
    workable,
    wuzzuf,
} from "./boards.js";

export const sources: SourceAdapter[] = [
    remoteok,
    remotive,
    arbeitnow,
    jobicy,
    himalayas,
    weworkremotely,
    wuzzuf,
    linkedin,
    greenhouse,
    ashby,
    workable,
];

export const sourceByKey = new Map(sources.map((s) => [s.key, s]));

/** Sources enabled when the caller does not name any. */
export const DEFAULT_SOURCES = [
    "remoteok",
    "remotive",
    "arbeitnow",
    "jobicy",
    "himalayas",
    "weworkremotely",
    "wuzzuf",
];

/**
 * Decides whether a source can serve this search at all.
 *
 * Calling a remote-only board for an on-site search in Egypt wastes a request
 * and returns nothing usable, so those get skipped rather than filtered after
 * the fact.
 */
export function isRelevant(source: SourceAdapter, params: ScrapeParams): boolean {
    if (source.geo === "remote-only") {
        // Worth calling only if the user would actually take a remote role.
        return params.worldwide || params.workPreference.length === 0 ||
            params.workPreference.includes("remote") || params.workPreference.includes("hybrid");
    }

    if (source.geo === "country") {
        if (params.worldwide || params.countries.length === 0) return true;
        return params.countries.some((c) => source.countries?.includes(c.code));
    }

    return true;
}

/**
 * Keeps postings a candidate in one of the requested markets could actually take.
 *
 * Two ways to qualify, and only two:
 *
 *  - **Remote.** Location-independent by definition, so it passes whatever the
 *    requested markets are. Someone in Cairo can take a remote role advertised
 *    from anywhere, and that is the product.
 *  - **Physically in a requested market.** A heuristic over the free-text
 *    location, deliberately generous — the AI scorer downstream does the precise
 *    judgement.
 *
 * Anything else is dropped. `worldwide` used to short-circuit this to `true`,
 * which meant "no geography filter at all" rather than "remote from anywhere":
 * a measured run returned 39% on-site roles in Germany, none of them any use to
 * a candidate who cannot be in Germany.
 *
 * Being generous into the shared pool is fine — `work_preference` on the
 * dashboard is what narrows it back down per user, so a remote role collected
 * for someone who only wants on-site is simply never shown to them.
 */
function matchesGeography(job: ScrapedJob, params: ScrapeParams): boolean {
    if (job.job_type === "remote") return true;

    // A physical role with nowhere to anchor it to cannot be placed, and it is
    // not remote, so there is no candidate it could suit.
    if (params.countries.length === 0) return false;

    /*
     * Location only. The title used to be in here too, which is how "Senior
     * Solutions Engineer" matched Somalia — a job title says nothing about
     * where the job is.
     */
    const original = job.location ?? "";
    if (!original.trim()) return false;

    const lowered = original.toLowerCase();
    return params.countries.some((c) => inCountry(lowered, original, c));
}

export interface RunOutcome {
    jobs: ScrapedJob[];
    results: SourceResult[];
}

/**
 * Runs every requested source concurrently and merges the results.
 *
 * `allSettled` with a per-source timeout is the whole reliability story: one
 * board being slow, rate-limited or newly Cloudflare-protected costs its own
 * results and nothing else. A run that loses LinkedIn still returns the other
 * six sources rather than failing.
 */
/**
 * Whether a listing is recent enough for this search.
 *
 * An undated listing passes. The alternative is discarding every row from the
 * several feeds that publish "latest N" without a date, which loses far more
 * than the stale rows it would catch — and the pool upserts on `apply_url`, so
 * a listing seen twice costs one row either way.
 */
function withinMaxAge(job: ScrapedJob, params: ScrapeParams): boolean {
    if (!params.maxAgeDays || params.maxAgeDays <= 0) return true;
    if (!job.posted_at_source) return true;

    const posted = new Date(job.posted_at_source).getTime();
    if (Number.isNaN(posted)) return true;

    return Date.now() - posted <= params.maxAgeDays * 864e5;
}

export async function runSources(
    params: ScrapeParams,
    keys: string[],
    perSourceTimeoutMs: number
): Promise<RunOutcome> {
    const selected = keys
        .map((k) => sourceByKey.get(k))
        .filter((s): s is SourceAdapter => Boolean(s));

    const settled = await Promise.all(
        selected.map(async (source): Promise<{ result: SourceResult; jobs: ScrapedJob[] }> => {
            const started = Date.now();

            if (!isRelevant(source, params)) {
                return {
                    jobs: [],
                    result: { source: source.key, ok: true, count: 0, ms: 0, error: "skipped — not relevant to this search" },
                };
            }

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), perSourceTimeoutMs);
            try {
                const jobs = await source.fetchJobs(params, controller.signal);
                const kept = jobs.filter(
                    (j) => j.apply_url && j.title && matchesGeography(j, params) && withinMaxAge(j, params)
                );
                return {
                    jobs: kept,
                    result: { source: source.key, ok: true, count: kept.length, ms: Date.now() - started },
                };
            } catch (error) {
                return {
                    jobs: [],
                    result: {
                        source: source.key,
                        ok: false,
                        count: 0,
                        ms: Date.now() - started,
                        error: error instanceof Error ? error.message : String(error),
                    },
                };
            } finally {
                clearTimeout(timer);
            }
        })
    );

    return {
        jobs: dedupe(settled.flatMap((s) => s.jobs)),
        results: settled.map((s) => s.result),
    };
}
