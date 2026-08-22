import type { CollectionStrategy, SearchContext, SourceKind } from "../core/types.js";
import { fetchText } from "../lib/http.js";
import { clean } from "../lib/normalize.js";

/** One `<item>`, as a map of tag name to text. Namespaced tags keep their prefix. */
export type RssItem = Record<string, string>;

export interface RssFeedConfig {
    url(ctx: SearchContext): string;
    headers?: Record<string, string>;
}

const ITEM = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
const TAG = /<([a-zA-Z][\w:.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
const CDATA = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/;

/**
 * An RSS feed, parsed into tag maps rather than per-field regexes.
 *
 * The adapter this replaces built a fresh `RegExp` per field per item — a new
 * pattern compiled for every `<title>` of every listing — and it only found the
 * tags it thought to ask for. Reading every tag once means a feed that adds a
 * field is usable without touching the parser.
 */
export class RssFeedStrategy implements CollectionStrategy<RssItem> {
    readonly kind: SourceKind = "rss";

    constructor(private readonly config: RssFeedConfig) {}

    async collect(ctx: SearchContext): Promise<RssItem[]> {
        const xml = await fetchText(this.config.url(ctx), ctx.signal, {
            headers: { Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8", ...this.config.headers },
        });

        const items: RssItem[] = [];
        for (const block of xml.matchAll(ITEM)) {
            const item: RssItem = {};
            for (const tag of block[1].matchAll(TAG)) {
                const name = tag[1].toLowerCase();
                // First wins: a repeated tag (multiple <category>) keeps the
                // first, which is the one publishers put the primary value in.
                if (item[name] === undefined) item[name] = clean(unwrapCdata(tag[2]));
            }
            if (Object.keys(item).length > 0) items.push(item);
        }
        return items;
    }
}

function unwrapCdata(value: string): string {
    return value.match(CDATA)?.[1] ?? value;
}
