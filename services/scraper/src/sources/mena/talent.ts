import type { SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonLdBoardSource } from "./JsonLdBoard.js";

/**
 * Talent.com — an aggregator rather than a board, which is the point: it
 * indexes company ATS feeds and other boards, so it reaches employers that
 * never post to Wuzzuf or Bayt while still filtering by country.
 *
 * Its country sites are subdomains, and the ones MENA cares about all answer.
 * Anything else falls back to `www`, which is the global index.
 */

const SUBDOMAINS = new Set(["eg", "sa", "ae", "ma", "tn", "dz", "qa", "kw", "bh", "om", "jo", "lb"]);

export class TalentSource extends JsonLdBoardSource {
    readonly descriptor: SourceDescriptor = {
        key: "talent",
        label: "Talent.com",
        kind: "detail",
        geo: "country",
        countries: [...SUBDOMAINS].map((code) => code.toUpperCase()),
        language: "en",
        enabledByDefault: true,
        note: "Aggregator with per-country subdomains. Detail pages publish a full JobPosting.",
    };

    protected listingUrls(ctx: SearchContext): string[] {
        const query = encodeURIComponent(ctx.query.trim());

        const hosts = ctx.countries
            .map((country) => country.code.toLowerCase())
            .filter((code) => SUBDOMAINS.has(code));

        const scopes = hosts.length > 0 ? [...new Set(hosts)] : ["www"];

        return scopes.map((host) => `https://${host}.talent.com/jobs?k=${query}`);
    }

    protected isDetailUrl(url: string): boolean {
        return /^https:\/\/[a-z]+\.talent\.com\/view\?id=\d+/.test(url);
    }
}
