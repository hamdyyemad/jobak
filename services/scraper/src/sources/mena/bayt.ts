import type { SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonLdBoardSource, slugifyQuery } from "./JsonLdBoard.js";
import { stealthAvailable } from "../../lib/http.js";

/**
 * Bayt — the Gulf's largest board, and the broadest MENA coverage of any source
 * here: every market Jobak serves has its own country path.
 *
 * The English site is read rather than the Arabic one. Both carry the same
 * JSON-LD, but the catalogue the collector sweeps is in English, and matching
 * an English query against Arabic titles would need a translation step to
 * accomplish nothing the English pages do not already give us.
 *
 * ── On, but only through the stealth transport ───────────────────────────
 *
 * Bayt sits behind Cloudflare, and Cloudflare rejects this runtime rather than
 * this code. Node's `fetch` gets a 403 "Attention Required" on every path
 * because undici's TLS fingerprint is not a browser's, and no header,
 * user-agent or delay changes that — it is decided before the request is sent.
 *
 * `services/browser` is the client that fixes it. Verified live: the same three
 * listing URLs that 403 undici come back at 200 with ~214KB and their
 * `ItemList` of 30 detail links intact, and a detail page yields a full
 * `JobPosting` — title, datePosted, employmentType, hiringOrganization and an
 * `addressCountry` — through the same parser that was already here.
 *
 * `enabledByDefault` is `true` because `accepts()` is the real gate: the source
 * runs only when the transport is actually deployed, and skips itself with a
 * stated reason when it is not. Leaving it off by default instead would mean
 * the collector never calls it even on a deployment that *can* reach it — the
 * failure this whole change exists to end. Without the transport it would spend
 * its whole budget collecting 403s, which is why there is no fallback.
 */

/** Bayt's own country path segments. Not ISO codes, and not derivable from them. */
const COUNTRY_PATHS: Record<string, string> = {
    AE: "uae", BH: "bahrain", DZ: "algeria", EG: "egypt", IQ: "iraq",
    JO: "jordan", KW: "kuwait", LB: "lebanon", LY: "libya", MA: "morocco",
    OM: "oman", PS: "palestine", QA: "qatar", SA: "saudi-arabia", SD: "sudan",
    SY: "syria", TN: "tunisia", YE: "yemen",
};

export class BaytSource extends JsonLdBoardSource {
    readonly descriptor: SourceDescriptor = {
        key: "bayt",
        label: "Bayt",
        kind: "detail",
        geo: "country",
        countries: Object.keys(COUNTRY_PATHS),
        language: "en",
        enabledByDefault: true,
        transport: "stealth",
        note: "Cloudflare rejects undici's TLS fingerprint with a 403 on every path, so this routes through services/browser. Skipped unless BROWSER_URL and BROWSER_SECRET are set.",
    };

    protected listingUrls(ctx: SearchContext): string[] {
        const query = slugifyQuery(ctx.query);

        const paths = ctx.countries
            .map((country) => COUNTRY_PATHS[country.code])
            .filter((path): path is string => Boolean(path));

        // `international` is Bayt's cross-border board — the right fallback when
        // the search names no market Bayt has a country path for.
        const scopes = paths.length > 0 ? [...new Set(paths)] : ["international"];

        return scopes.map((scope) => `https://www.bayt.com/en/${scope}/jobs/${query}-jobs/`);
    }

    /**
     * Callable only when the client that can reach Bayt exists.
     *
     * Named explicitly rather than left to `enabledByDefault` so the skip
     * carries a reason into `meta.sources` — "no stealth transport" is a
     * deployment fact someone can act on, where a silent absence is not.
     */
    protected accepts(ctx: SearchContext): boolean {
        return stealthAvailable() && super.accepts(ctx);
    }

    protected skipReason(ctx: SearchContext): string {
        return stealthAvailable()
            ? super.skipReason(ctx)
            : "no stealth transport — set BROWSER_URL and BROWSER_SECRET (see services/browser)";
    }

    protected isDetailUrl(url: string): boolean {
        // Job pages end in the posting id: /en/egypt/jobs/senior-backend-engineer-75056350/
        return /^https:\/\/www\.bayt\.com\/en\/[^/]+\/jobs\/.+-\d+\/?$/.test(url);
    }
}
