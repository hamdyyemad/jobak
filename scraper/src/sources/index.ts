import type { ScrapedJob, ScrapeParams, SourceAdapter, SourceResult } from "../types.js";
import { dedupe } from "../normalize.js";
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
 * Keeps postings that plausibly sit in one of the requested countries.
 *
 * A heuristic on free-text location, deliberately generous: remote roles always
 * pass, and anything ambiguous passes too. The AI scorer downstream does the
 * precise judgement — the job here is only to stop an obviously wrong market
 * from being paid for.
 */
function matchesGeography(job: ScrapedJob, params: ScrapeParams): boolean {
    if (params.worldwide || params.countries.length === 0) return true;
    if (job.job_type === "remote") return true;

    const haystack = `${job.location} ${job.title}`.toLowerCase();
    if (!haystack.trim()) return true;

    return params.countries.some(
        (c) => haystack.includes(c.name.toLowerCase()) || haystack.includes(c.code.toLowerCase())
    );
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
                const kept = jobs.filter((j) => j.apply_url && j.title && matchesGeography(j, params));
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
