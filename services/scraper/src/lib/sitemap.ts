import { fetchText } from "./http.js";

/**
 * Sitemaps, followed properly.
 *
 * Ported from the shape of Scrapling's sitemap spider template
 * (`scrapling/spiders/templates/sitemap.py`), which descends into a
 * `<sitemapindex>` recursively instead of assuming the first file it is handed
 * is the whole list.
 *
 * The Wuzzuf source needed this. It read `sitemap-job-1.xml` by name, which is
 * correct only for as long as Wuzzuf keeps every job in one file — the `-1`
 * suffix is Wuzzuf telling us it intends to shard. The day it adds
 * `sitemap-job-2.xml` the source keeps working and quietly stops seeing half
 * the market, which is the worst kind of breakage: no error, just less.
 *
 * **`.xml.gz` sitemaps are not supported.** They are common on the web but no
 * source here serves one, and handling them properly means reading the body as
 * bytes rather than text — a change to the fetch layer that would be written
 * blind and tested against nothing. A gzipped child is skipped with the same
 * shrug as an unreadable one; add real support when a real source needs it.
 */

const LOC = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
const IS_INDEX = /<sitemapindex[\s>]/i;

export interface SitemapOptions {
    /** Which child sitemaps of an index are worth descending into. */
    accept?(url: string): boolean;
    /** How deep to follow nested indexes. Two covers every real-world layout. */
    maxDepth?: number;
    /** Ceiling on child sitemaps fetched, so a huge index cannot eat the budget. */
    maxFiles?: number;
    timeoutMs?: number;
}

/**
 * Every page URL reachable from a sitemap or sitemap index.
 *
 * Returns page URLs only — the index entries themselves are followed, not
 * returned, so a caller cannot accidentally treat a sitemap as a job page.
 */
export async function collectSitemapUrls(
    start: string,
    signal: AbortSignal,
    options: SitemapOptions = {}
): Promise<string[]> {
    const accept = options.accept ?? (() => true);
    const maxDepth = options.maxDepth ?? 2;
    const maxFiles = options.maxFiles ?? 8;

    const seen = new Set<string>();
    const pages: string[] = [];
    let fetched = 0;

    const visit = async (url: string, depth: number): Promise<void> => {
        if (depth > maxDepth || fetched >= maxFiles || seen.has(url) || signal.aborted) return;
        seen.add(url);
        fetched++;

        const xml = await readSitemap(url, signal, options.timeoutMs ?? 8_000);
        if (!xml) return;

        const locs = [...xml.matchAll(LOC)].map((match) => decodeXml(match[1]));

        if (IS_INDEX.test(xml)) {
            // An index: these are sitemaps, not pages.
            for (const child of locs) {
                if (accept(child)) await visit(child, depth + 1);
            }
            return;
        }

        pages.push(...locs);
    };

    await visit(start, 0);
    return pages;
}

async function readSitemap(url: string, signal: AbortSignal, timeoutMs: number): Promise<string | null> {
    // Compressed sitemaps read as text arrive as mojibake rather than as an
    // error, so they are refused up front instead of producing zero matches.
    if (/\.gz(\?|$)/i.test(url)) return null;

    try {
        return await fetchText(url, signal, { timeoutMs });
    } catch {
        // One unreadable child sitemap costs its own URLs, not the whole run.
        return null;
    }
}

const XML_ENTITIES: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
};

function decodeXml(value: string): string {
    return value.replace(/&(amp|lt|gt|quot|apos);/g, (whole) => XML_ENTITIES[whole] ?? whole);
}
