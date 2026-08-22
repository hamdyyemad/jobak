import type { RunnableSource, ScrapedJob, SearchRequest, SourceResult } from "./types.js";
import { foldForMatch } from "../lib/normalize.js";

export interface RunOutcome {
    jobs: ScrapedJob[];
    results: SourceResult[];
}

/**
 * Runs every selected source concurrently and merges the results.
 *
 * The per-source timeout is the whole reliability story. Each source gets its
 * own `AbortController`, so a board that has quietly started answering in 30
 * seconds costs its own slot and returns; the rest of the run is unaffected and
 * the response still arrives inside the platform's function limit.
 */
export async function runSearch(
    request: SearchRequest,
    sources: RunnableSource[],
    perSourceTimeoutMs: number
): Promise<RunOutcome> {
    const runs = await Promise.all(
        sources.map(async (source) => {
            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(new Error(`source timed out after ${perSourceTimeoutMs}ms`)),
                perSourceTimeoutMs
            );
            try {
                return await source.run({ ...request, signal: controller.signal });
            } finally {
                clearTimeout(timer);
            }
        })
    );

    return {
        jobs: dedupe(runs.flatMap((run) => run.jobs)),
        results: runs.map((run) => run.result),
    };
}

/**
 * Keeps the first sighting of each posting, across sources as well as within one.
 *
 * Two keys, because one is not enough. `apply_url` catches the same board
 * returning a listing twice. The company/title/location key catches what the
 * URL cannot: a req cross-posted to Wuzzuf, Bayt and the company's own
 * Greenhouse board is three URLs and one job, and shipping all three into the
 * pool means the user is shown the same role three times.
 *
 * Source order decides which copy survives, so register the sources whose rows
 * carry the most detail first.
 */
function dedupe(jobs: ScrapedJob[]): ScrapedJob[] {
    const seenUrls = new Set<string>();
    const seenPostings = new Set<string>();
    const out: ScrapedJob[] = [];

    for (const job of jobs) {
        if (!job.apply_url || !job.title) continue;
        if (seenUrls.has(job.apply_url)) continue;

        /*
         * Location is part of the key deliberately. "Software Engineer" at a
         * consultancy in Cairo and the same title at the same consultancy in
         * Dubai are two openings, and collapsing them would hide one.
         */
        const posting = [foldForMatch(job.company), foldForMatch(job.title), foldForMatch(job.location)].join("|");
        if (seenPostings.has(posting)) continue;

        seenUrls.add(job.apply_url);
        seenPostings.add(posting);
        out.push(job);
    }

    return out;
}
