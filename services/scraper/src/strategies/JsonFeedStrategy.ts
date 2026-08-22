import type { CollectionStrategy, SearchContext, SourceKind } from "../core/types.js";
import { fetchJson } from "../lib/http.js";

export interface JsonFeedConfig<TRaw> {
    /** The feed URL for this search. Most of these ignore query parameters. */
    url(ctx: SearchContext): string;
    /** The array of records inside whatever envelope the board wraps them in. */
    extract(payload: unknown, ctx: SearchContext): TRaw[];
    /**
     * Where the next page lives, if the feed paginates. Return `null` to stop.
     * Only Arbeitnow needs this; everyone else returns their whole feed at once.
     */
    nextUrl?(payload: unknown, ctx: SearchContext): string | null;
    /** Hard stop on pagination, so a feed that never ends cannot hang the run. */
    maxPages?: number;
    headers?: Record<string, string>;
}

/**
 * A board that publishes a free, documented, no-auth JSON feed.
 *
 * These are the reason a self-hosted scraper is viable at all: they are not
 * scraping targets, they are public APIs the boards want consumed. No proxy, no
 * browser, no per-request cost, and no terms-of-service grey area.
 */
export class JsonFeedStrategy<TRaw> implements CollectionStrategy<TRaw> {
    readonly kind: SourceKind = "api";

    constructor(private readonly config: JsonFeedConfig<TRaw>) {}

    async collect(ctx: SearchContext): Promise<TRaw[]> {
        const maxPages = this.config.maxPages ?? 1;
        const rows: TRaw[] = [];

        let url: string | null = this.config.url(ctx);
        for (let page = 0; page < maxPages && url; page++) {
            const payload: unknown = await fetchJson(url, ctx.signal, { headers: this.config.headers });
            rows.push(...this.config.extract(payload, ctx));

            url = this.config.nextUrl?.(payload, ctx) ?? null;
        }

        return rows;
    }
}
