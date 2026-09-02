import type { CollectionStrategy, SearchContext, SourceKind, Transport } from "../core/types.js";
import { Budget, mapLimit, tryFetchText } from "../lib/http.js";

export interface DetailPageConfig<TRaw> {
    /**
     * URLs of pages that each carry exactly one listing.
     *
     * Where the structure actually lives varies — Bayt and Talent.com publish an
     * `ItemList` of them in JSON-LD, Wuzzuf publishes them in its sitemap — so
     * discovery is the source's business and this strategy only fans out.
     *
     * Return them already narrowed to the search: this is the only place that
     * can cheaply reject a listing before paying for a request.
     */
    discover(ctx: SearchContext): Promise<string[]>;

    /**
     * One detail page → the records on it, or `null` if it is not a listing.
     *
     * Usually one. Wuzzuf is why this may return several: its pages ship the
     * whole hydration store, so a single fetch also yields the fifteen-odd
     * related postings alongside the one that was asked for. Those are free
     * listings — already paid for — and the query filter upstream keeps only
     * the ones that answer the search.
     */
    parse(html: string, url: string, ctx: SearchContext): TRaw | TRaw[] | null;

    /** Simultaneous detail fetches. Six looks like a browser; sixty looks like an attack. */
    concurrency?: number;

    /** Wall-clock allowance for the fan-out, inside the source's own timeout. */
    budgetMs?: number;

    /** Per-request cap, so one hanging page cannot drain the shared budget. */
    requestTimeoutMs?: number;

    /**
     * How many pages to fetch per listing wanted.
     *
     * Above 1 because some detail pages turn out not to be listings, or get
     * dropped by the geography filter afterwards; fetching exactly `limit`
     * would then return fewer than asked for every time.
     */
    overFetch?: number;

    headers?: Record<string, string>;

    /** Which client fetches the detail pages. Defaults to this runtime's `fetch`. */
    transport?: Transport;
}

/**
 * Listings that only exist on their own page.
 *
 * The strategy that made the MENA boards workable. Their search pages are
 * client-rendered shells — Wuzzuf's serves literal `{{keyword}}` mustache
 * templates to any plain HTTP client, which is why the regex adapter this
 * replaces was quietly returning a single job — but their *detail* pages are
 * server-rendered and carry schema.org `JobPosting` or Open Graph metadata,
 * because that is what Google indexes.
 *
 * So: discover the pages a search cares about, fetch them under a concurrency
 * limit and a clock, and read the structured data the publisher put there on
 * purpose. A redesign of the search UI cannot break this; only dropping their
 * own SEO markup could.
 */
export class DetailPageStrategy<TRaw> implements CollectionStrategy<TRaw> {
    readonly kind: SourceKind = "detail";

    constructor(private readonly config: DetailPageConfig<TRaw>) {}

    async collect(ctx: SearchContext): Promise<TRaw[]> {
        const budget = new Budget(this.config.budgetMs ?? 9_000);

        const discovered = await this.config.discover(ctx);
        const wanted = Math.ceil(ctx.limit * (this.config.overFetch ?? 2));
        const targets = discovered.slice(0, wanted);

        const parsed = await mapLimit(targets, this.config.concurrency ?? 6, async (url) => {
            /*
             * Checked per item rather than once up front: discovery itself can
             * be most of the budget on a large sitemap, and the point is to
             * return what we have when the clock runs out rather than to start
             * a fan-out we cannot finish.
             */
            if (budget.expired || ctx.signal.aborted) return null;

            const html = await tryFetchText(url, ctx.signal, {
                headers: this.config.headers,
                transport: this.config.transport,
                timeoutMs: Math.min(this.config.requestTimeoutMs ?? 6_000, budget.remainingMs || 1),
            });
            if (!html) return null;

            try {
                return this.config.parse(html, url, ctx);
            } catch {
                return null;
            }
        });

        return parsed.flatMap((record) => {
            if (record === null || record === undefined) return [];
            return Array.isArray(record) ? record : [record];
        });
    }
}
