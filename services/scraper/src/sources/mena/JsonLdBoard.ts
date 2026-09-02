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

    private cachedStrategy?: DetailPageStrategy<JobPostingResult>;

    /**
     * A getter, not a field, because it reads `this.descriptor`.
     *
     * Field initialisers on a base class run before the subclass's own fields
     * exist, so `this.descriptor.transport` is `undefined` at that point and
     * every board would silently get the default transport. Built on first use
     * instead, which is inside `collect`, by which time the subclass is whole.
     */
    protected get strategy(): DetailPageStrategy<JobPostingResult> {
        const transport = this.descriptor.transport;

        return (this.cachedStrategy ??= new DetailPageStrategy<JobPostingResult>({
            discover: (ctx) => this.discover(ctx),
            parse: (html, url) => {
                const node = findJsonLd(html, "JobPosting");
                return node ? fromJobPosting(node, url) : null;
            },
            transport,
            /*
             * Two on the stealth path, six on the plain one.
             *
             * Six is the browser-shaped default everywhere else, but Bayt's
             * Cloudflare rate-limits it hard: measured live, six concurrent
             * detail fetches returned 2 of 6, and a second burst returned 0 of
             * 6 — the whole client IP blocked. After a cooldown, two at a time
             * with a gap between pairs returned 6 of 6, twice. The transport
             * gets past the fingerprint gate; it does not buy a bigger
             * allowance, and pretending otherwise just burns the source.
             */
            concurrency: transport === "stealth" ? 2 : 6,
            budgetMs: 9_000,
        }));
    }

    /**
     * One listing page per market, and a refusal on one is not a failure.
     *
     * These boards are queried once per country — Egypt, Saudi, the UAE — and
     * Bayt's Cloudflare refuses *paths*, transiently: during testing one URL
     * came back 403 in the same minute another returned 214KB. Letting the
     * first refusal throw would have thrown away the two markets that would
     * have answered, so each is attempted and only a clean sweep of failures
     * is reported as one.
     */
    private async discover(ctx: SearchContext): Promise<string[]> {
        const found: string[] = [];
        let lastError: unknown = null;
        let attempted = 0;

        for (const listing of this.listingUrls(ctx)) {
            if (ctx.signal.aborted) break;
            attempted++;

            try {
                const html = await fetchText(listing, ctx.signal, {
                    timeoutMs: 8_000,
                    transport: this.descriptor.transport,
                });
                for (const url of itemListUrls(html, listing)) {
                    if (this.isDetailUrl(url) && !found.includes(url)) found.push(url);
                }
            } catch (error) {
                lastError = error;
            }
        }

        // Every market refused is a real outage and must not read as "nothing
        // is hiring" — that silence is exactly how the old Wuzzuf adapter went
        // unnoticed while returning almost nothing.
        if (found.length === 0 && lastError !== null && attempted > 0) throw lastError;

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
