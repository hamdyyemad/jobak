import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext } from "../../core/types.js";
import { DetailPageStrategy } from "../../strategies/DetailPageStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { fetchText } from "../../lib/http.js";
import { itemListUrls } from "../../lib/html.js";
import { findJsonLd } from "../../lib/html.js";
import { fromJobPosting, type JobPostingResult } from "../../lib/jobposting.js";

/**
 * A board that publishes schema.org on both halves of its funnel.
 *
 * Bayt and Talent.com are the same source twice over: a search page carrying an
 * `ItemList` of result URLs, and detail pages each carrying a complete
 * `JobPosting`. Neither renders a usable listing without JavaScript, and
 * neither needs to — the structured data is there for Google, and it is more
 * complete than anything a card parser could recover from the markup.
 *
 * So the shared half lives here and a concrete board supplies only the two
 * things that differ: which URLs to search, and which of the links on them are
 * jobs.
 */
export abstract class JsonLdBoardSource extends JobSource<JobPostingResult> {
    /** The search URLs to read result lists from, in priority order. */
    protected abstract listingUrls(ctx: SearchContext): string[];

    /** Distinguishes a job page from the navigation the `ItemList` also carries. */
    protected abstract isDetailUrl(url: string): boolean;

    protected readonly strategy = new DetailPageStrategy<JobPostingResult>({
        discover: (ctx) => this.discover(ctx),
        parse: (html, url) => {
            const node = findJsonLd(html, "JobPosting");
            return node ? fromJobPosting(node, url) : null;
        },
        concurrency: 6,
        budgetMs: 9_000,
    });

    private async discover(ctx: SearchContext): Promise<string[]> {
        const found: string[] = [];

        for (const listing of this.listingUrls(ctx)) {
            if (ctx.signal.aborted) break;

            const html = await fetchText(listing, ctx.signal, { timeoutMs: 8_000 });
            for (const url of itemListUrls(html, listing)) {
                if (this.isDetailUrl(url) && !found.includes(url)) found.push(url);
            }
        }

        return found;
    }

    /**
     * These boards *do* search server-side, so the results already answer the
     * query — but loosely, and both pad a thin result set with "related" roles.
     * Re-applying the filter costs nothing and keeps a search for "Data
     * Engineer" from returning the receptionist job Bayt tacked on the end.
     */
    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(result: JobPostingResult): ScrapedJob | null {
        return {
            ...result.job,
            source_key: this.descriptor.key,
            company_links: result.companyWebsite
                ? { website: result.companyWebsite, linkedin: null, careers: null }
                : undefined,
        };
    }
}

/** `Backend Engineer` → `backend-engineer`, the slug form both boards use in paths. */
export function slugifyQuery(query: string): string {
    return (
        query
            .toLowerCase()
            .replace(/[^a-z0-9؀-ۿ]+/g, "-")
            .replace(/^-|-$/g, "") || "jobs"
    );
}
