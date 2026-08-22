import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext } from "../../core/types.js";
import type { AtsRow } from "../../strategies/AtsStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";

/**
 * The half every applicant tracking system shares.
 *
 * These are the best listings in the whole set — first-party, complete
 * descriptions, always current, and the apply URL is the company's own careers
 * page rather than an aggregator's redirect, which means they need no company
 * enrichment at all. Registering them ahead of the aggregators is what makes
 * the pipeline's dedupe keep *this* copy of a cross-posted role.
 */
export abstract class AtsBoardSource extends JobSource<AtsRow> {
    /**
     * No slugs, no request.
     *
     * An ATS cannot be asked "what is hiring" in general — only "what is hiring
     * at this company" — so a source with an empty slug list has nothing to do
     * and says so, rather than reporting a silent zero that reads like failure.
     */
    protected accepts(ctx: SearchContext): boolean {
        return (ctx.ats[this.descriptor.key]?.length ?? 0) > 0;
    }

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }
}
