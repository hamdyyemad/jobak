import { fetchJson, tryFetchText } from "../lib/http.js";
import { clean, foldForMatch } from "../lib/normalize.js";

/**
 * Finding a company's own website when no source named one — for free.
 *
 * This replaces a Brave Search API key. The whole search-engine family turned
 * out to be closed to us anyway, so the paid option was buying very little:
 *
 *   - `duckduckgo.com/robots.txt` disallows `/lite` and `/html`
 *   - `api.duckduckgo.com/robots.txt` is `Disallow: /` — the Instant Answer
 *     API included, so that is not a loophole either
 *   - Google and Bing disallow their result pages outright
 *
 * What is left is genuinely free and genuinely permitted, in descending order
 * of how much you should trust it. Each resolver is tried in turn and the first
 * hit wins, so the expensive-and-fallible one only runs for companies the
 * reliable ones could not place.
 */
export interface WebsiteResolver {
    /** Recorded on the company row as `resolved_via`, so a guess stays labelled. */
    readonly name: "wikidata" | "guess";
    resolve(company: string, signal: AbortSignal): Promise<string | null>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Wikidata
 * ────────────────────────────────────────────────────────────────────────── */

interface SearchResponse {
    search?: { id?: string }[];
}

interface EntityResponse {
    entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }>;
}

/**
 * Wikidata's `official website` property (P856).
 *
 * A real, open, documented API with no key and no rate limit worth worrying
 * about at this volume, and the answer is curated rather than inferred — when
 * it has an entry it is right. It only knows companies notable enough to have
 * one, which in a measured run meant Careem, Swvl, Talabat and Fawry but not
 * Instabug, Foodics or Vezeeta. That is exactly the split the guesser covers.
 */
export const wikidataResolver: WebsiteResolver = {
    name: "wikidata",

    async resolve(company, signal) {
        const query = encodeURIComponent(company);
        const headers = {
            // Wikimedia asks for a descriptive agent that identifies the client.
            "User-Agent": "jobak-scraper/1.0 (+https://github.com/hamdyyemad/jobak)",
            Accept: "application/json",
        };

        try {
            const found = await fetchJson<SearchResponse>(
                `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=3&search=${query}`,
                signal,
                { headers, timeoutMs: 5_000 }
            );

            for (const hit of found.search ?? []) {
                if (!hit.id) continue;

                const entity = await fetchJson<EntityResponse>(
                    `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(hit.id)}.json`,
                    signal,
                    { headers, timeoutMs: 5_000 }
                );

                const website = entity.entities?.[hit.id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
                if (typeof website === "string" && website) return website;
            }
        } catch {
            // Never fatal — enrichment degrades to whatever the source knew.
        }

        return null;
    },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Domain guessing
 * ────────────────────────────────────────────────────────────────────────── */

const TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".eg", ".sa", ".ae", ".ma", ".tn"];

/** Pages that resolve but are not a company site. */
const PARKED =
    /domain (is )?for sale|buy this domain|parked (free )?(courtesy|domain)|this domain may be for sale|under construction/i;

/**
 * Try the obvious domains, and only believe one that proves itself.
 *
 * Guessing alone would be indefensible — `acme.com` belongs to whoever
 * registered it, not to the Acme in the job ad. So a candidate is only accepted
 * if the company's name appears in the page's `<title>` or `og:site_name`.
 * Body text is not enough: it matched a kids' tablet site for "Tabby" (the
 * fintech is `tabby.ai`), which is precisely the kind of wrong answer that is
 * worse than no answer.
 *
 * **Even so, this one can be wrong**, and "Tabby" survives the tightened check
 * because the name really is in the other company's title. That is unfixable by
 * guessing, which is why the result is labelled `guess` all the way through to
 * `companies.resolved_via` — a consumer that only wants facts can filter it
 * out, and nothing silently presents it as verified.
 */
export const domainGuessResolver: WebsiteResolver = {
    name: "guess",

    async resolve(company, signal) {
        const needle = foldForMatch(company);
        if (needle.replace(/\s/g, "").length < 3) return null;

        for (const slug of slugsFor(company)) {
            for (const tld of TLDS) {
                if (signal.aborted) return null;

                const candidate = `https://${slug}${tld}`;
                const html = await tryFetchText(candidate, signal, { timeoutMs: 5_000 });
                if (!html || PARKED.test(html.slice(0, 4000))) continue;

                if (hasNameEvidence(html, needle)) return candidate;
            }
        }

        return null;
    },
};

/**
 * "K Line Europe" → `klineeurope`, `k-line-europe`, `kline`.
 *
 * The hyphenated form matters more than it looks: `mobi-egypt.com` and
 * `kline-europe.com` are both real, and a joined-only guesser misses them.
 */
function slugsFor(company: string): string[] {
    const words = clean(company)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .split(/[\s-]+/)
        .filter(Boolean);

    if (words.length === 0) return [];

    const out = new Set<string>([words.join("")]);
    if (words.length > 1) {
        out.add(words.join("-"));
        // A first word long enough to be distinctive on its own — "instabug" of
        // "Instabug Inc", not "the" of "The Company".
        if (words[0].length >= 5) out.add(words[0]);
    }
    return [...out];
}

function hasNameEvidence(html: string, needle: string): boolean {
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const siteName =
        html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";

    const compact = (value: string) => foldForMatch(value).replace(/\s+/g, "");
    const target = compact(needle);

    return compact(title).includes(target) || compact(siteName).includes(target);
}

/**
 * The chain, best-evidence first.
 *
 * Guessing goes last because it is both the slowest — up to 33 requests for a
 * company that does not resolve — and the only one that can be confidently
 * wrong.
 */
export function freeResolvers(): WebsiteResolver[] {
    return [wikidataResolver, domainGuessResolver];
}
