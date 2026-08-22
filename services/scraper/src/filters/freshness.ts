import type { ScrapedJob, SearchContext } from "../core/types.js";

/**
 * Whether a listing is recent enough for this search.
 *
 * An undated listing passes. The alternative is discarding every row from the
 * several feeds that publish "latest N" without a date, which loses far more
 * than the stale rows it would catch — and the pool upserts on `apply_url`, so
 * a listing seen twice costs one row either way.
 */
export function withinMaxAge(job: ScrapedJob, ctx: SearchContext): boolean {
    if (!ctx.maxAgeDays || ctx.maxAgeDays <= 0) return true;
    if (!job.posted_at_source) return true;

    const posted = new Date(job.posted_at_source).getTime();
    if (Number.isNaN(posted)) return true;

    return Date.now() - posted <= ctx.maxAgeDays * 864e5;
}
