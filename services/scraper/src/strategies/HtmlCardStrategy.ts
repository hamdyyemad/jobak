import type { CollectionStrategy, SearchContext, SourceKind } from "../core/types.js";
import { fetchText } from "../lib/http.js";

export interface HtmlCardConfig<TRaw> {
    /** One or more listing pages to read. Multiple entries page through results. */
    urls(ctx: SearchContext): string[];
    /** Split one listing page into per-job records. */
    cards(html: string, url: string, ctx: SearchContext): TRaw[];
    /** Text that means the page refused us rather than returned results. */
    blockedBy?: RegExp;
    headers?: Record<string, string>;
}

/**
 * A listing page that really does carry its jobs in the HTML.
 *
 * The last resort, and used for exactly one source. Card parsing breaks the
 * moment a site ships a redesign, whereas JSON-LD and sitemaps are contracts
 * with search engines that sites maintain deliberately — so reach for
 * `DetailPageStrategy` first and only fall back here when a board publishes no
 * structured data at all.
 */
export class HtmlCardStrategy<TRaw> implements CollectionStrategy<TRaw> {
    readonly kind: SourceKind = "html";

    constructor(private readonly config: HtmlCardConfig<TRaw>) {}

    async collect(ctx: SearchContext): Promise<TRaw[]> {
        const rows: TRaw[] = [];

        for (const url of this.config.urls(ctx)) {
            if (ctx.signal.aborted || rows.length >= ctx.limit) break;

            const html = await fetchText(url, ctx.signal, { headers: this.config.headers });

            /*
             * A challenge page is a 200 with the wrong body, so it has to be
             * detected by content. Throwing makes the run report "blocked"
             * rather than the far more misleading "0 results".
             */
            if (this.config.blockedBy?.test(html)) {
                throw new Error(`blocked — ${url} served a challenge or login wall`);
            }

            rows.push(...this.config.cards(html, url, ctx));
        }

        return rows;
    }
}
