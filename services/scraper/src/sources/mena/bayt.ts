import type { SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonLdBoardSource, slugifyQuery } from "./JsonLdBoard.js";

/**
 * Bayt — the Gulf's largest board, and the broadest MENA coverage of any source
 * here: every market Jobak serves has its own country path.
 *
 * The English site is read rather than the Arabic one. Both carry the same
 * JSON-LD, but the catalogue the collector sweeps is in English, and matching
 * an English query against Arabic titles would need a translation step to
 * accomplish nothing the English pages do not already give us.
 *
 * ── Off by default, and it is not the parser ─────────────────────────────
 *
 * Bayt sits behind Cloudflare, and Cloudflare rejects this runtime rather than
 * this code. `curl` fetches every URL below with a 200; Node's `fetch` gets a
 * 403 "Attention Required" on all of them — listing pages, detail pages, even
 * `sitemap.xml` — because undici's TLS fingerprint is not a browser's. No
 * header, no user-agent and no delay changes that; it is decided before the
 * request is sent.
 *
 * The source is kept because the parser is correct and the structured data is
 * real, verified through curl: this becomes the single best MENA source the day
 * it is given a client that can impersonate a browser (curl-impersonate, or any
 * residential proxy that terminates TLS itself). Until then it would only ever
 * burn a timeout, so it stays off and says why in `/api/sources`.
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
        enabledByDefault: false,
        note: "Blocked from Node: Cloudflare rejects undici's TLS fingerprint with a 403 on every path. Needs an impersonating client or a proxy.",
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

    protected isDetailUrl(url: string): boolean {
        // Job pages end in the posting id: /en/egypt/jobs/senior-backend-engineer-75056350/
        return /^https:\/\/www\.bayt\.com\/en\/[^/]+\/jobs\/.+-\d+\/?$/.test(url);
    }
}
