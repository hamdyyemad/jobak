import { tryFetchText } from "../lib/http.js";
import { clean, foldForMatch } from "../lib/normalize.js";

/**
 * Finding a company's own website when no source named one — for free, and
 * without fetching anything we have been told not to.
 *
 * This started as a Brave Search API key, became a Wikidata lookup, and is now
 * a single verified domain guess. Both retreats were forced by robots.txt, and
 * both were found by the parser in `lib/robots.ts` rather than by reading:
 *
 *   - `duckduckgo.com` disallows `/lite` and `/html`; `api.duckduckgo.com` is
 *     `Disallow: /` outright, so the Instant Answer API is not a loophole.
 *     Google and Bing disallow their result pages.
 *   - **Wikidata disallows `/w/`**, which is where `api.php` lives — the search
 *     step the resolver depended on. Its machine-readable
 *     `Special:EntityData/*.` endpoint *is* explicitly allowed, but reaching it
 *     needs a QID and the only compliant ways to get one cost two more hops.
 *     `query.wikidata.org` disallows `/sparql` as well.
 *
 * Dropping Wikidata cost almost nothing measurable: it only knew companies
 * notable enough to have an entry, and the guesser resolves those too — Careem
 * lands on `careem.com` either way. What is left is one resolver that makes its
 * own evidence.
 */
export interface WebsiteResolver {
    /** Recorded on the company row as `resolved_via`, so a guess stays labelled. */
    readonly name: "guess";
    resolve(company: string, signal: AbortSignal): Promise<string | null>;
}

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
 * **Even so, this can be wrong**, and "Tabby" survives the tightened check
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
                /*
                 * Goes through `tryFetchText`, so the robots parser and the
                 * throttle apply here too. A company that asks not to be
                 * crawled does not get crawled just because we are guessing.
                 */
                const html = await tryFetchText(candidate, signal, { timeoutMs: 5_000, maxWaitMs: 1_500 });
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
 * The chain. One resolver now, and it runs last by construction — the caller
 * tries the source's own answer and the apply URL first, both of which are free
 * and exact.
 */
export function freeResolvers(): WebsiteResolver[] {
    return [domainGuessResolver];
}
