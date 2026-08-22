import { fetchJson } from "../lib/http.js";
import { clean } from "../lib/normalize.js";

/**
 * Finding a company's own website when no source told us one.
 *
 * This is deliberately an interface with no default implementation, because the
 * obvious shortcut is not available: DuckDuckGo's `robots.txt` disallows both
 * `/lite` and `/html`, the two endpoints a scraper would reach for, and Google
 * and Bing disallow their result pages outright. Scraping a search engine to
 * populate this field would be the one genuinely non-compliant thing in the
 * whole service.
 *
 * So resolution by search is opt-in and uses a real API. Without a key
 * configured, enrichment still works — it just relies on the website a source
 * hands over, which for Wuzzuf is every job and for a JSON-LD board is most of
 * them.
 */
export interface WebSearch {
    /** The most likely official homepage for this company, or null. */
    findHomepage(company: string, signal: AbortSignal): Promise<string | null>;
}

interface BraveResponse {
    web?: { results?: { url?: string; title?: string }[] };
}

/**
 * Brave Search. Chosen because it has a documented free tier, returns JSON, and
 * is a search *API* rather than a search page — no terms to tiptoe around.
 *
 * Set `BRAVE_SEARCH_API_KEY` to enable it. Any other provider can be dropped in
 * by implementing `WebSearch`.
 */
export function braveSearch(apiKey: string): WebSearch {
    return {
        async findHomepage(company, signal) {
            const query = encodeURIComponent(`${company} official site`);

            try {
                const payload = await fetchJson<BraveResponse>(
                    `https://api.search.brave.com/res/v1/web/search?q=${query}&count=5`,
                    signal,
                    {
                        headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
                        timeoutMs: 5_000,
                    }
                );

                const results = payload.web?.results ?? [];
                return results.map((result) => clean(result.url)).find(Boolean) ?? null;
            } catch {
                // A search failure degrades enrichment; it never fails the run.
                return null;
            }
        },
    };
}

/** The configured provider, or `null` when none is. */
export function searchFromEnv(): WebSearch | null {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    return key ? braveSearch(key) : null;
}
