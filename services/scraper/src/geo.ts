import type { Country } from "./types.js";

/**
 * Deciding whether a free-text location sits in one of our markets.
 *
 * The naive version of this was `haystack.includes(code.toLowerCase())`, and a
 * two-letter substring is catastrophically loose: "ger**ma**ny" matched MA
 * (Morocco), "**so**ftware" and "**so**lutions" matched SO (Somalia). A
 * measured run let a page of Berlin on-site roles through on exactly that.
 *
 * So: names and city aliases are matched on word boundaries, and the country
 * code only ever matches as a standalone uppercase token in the original text —
 * "Cairo, EG" counts, "Engineer" does not.
 */

/**
 * Cities and common spellings, because most postings name a city and never the
 * country: "Dubai", not "Dubai, United Arab Emirates".
 *
 * Only the markets Jobak serves are listed — this is a matcher for our own
 * geography, not a gazetteer.
 */
const ALIASES: Record<string, string[]> = {
    AE: ["dubai", "abu dhabi", "sharjah", "ajman", "uae", "u.a.e", "emirates"],
    BH: ["manama", "bahrein"],
    DJ: ["djibouti city"],
    DZ: ["algiers", "alger", "oran", "constantine", "algerie"],
    EG: ["cairo", "giza", "alexandria", "kairo", "new cairo", "maadi", "nasr city", "egypte"],
    IQ: ["baghdad", "erbil", "irbil", "basra", "mosul"],
    JO: ["amman", "irbid", "zarqa"],
    KM: ["moroni"],
    KW: ["kuwait city", "hawalli", "salmiya"],
    LB: ["beirut", "beyrouth", "tripoli lebanon"],
    LY: ["tripoli", "benghazi", "misrata"],
    MA: ["casablanca", "rabat", "marrakech", "marrakesh", "tangier", "fes", "maroc"],
    MR: ["nouakchott"],
    OM: ["muscat", "masqat", "salalah"],
    PS: ["gaza", "ramallah", "nablus", "hebron", "west bank"],
    QA: ["doha", "al rayyan"],
    SA: ["riyadh", "jeddah", "dammam", "khobar", "mecca", "medina", "ksa", "saudi"],
    SD: ["khartoum", "omdurman"],
    SO: ["mogadishu", "hargeisa"],
    SY: ["damascus", "aleppo", "homs"],
    TN: ["tunis", "sfax", "sousse", "tunisie"],
    YE: ["sanaa", "sana'a", "aden", "taiz"],
};

/** Escapes a needle so a stray "." or "'" in an alias cannot alter the regex. */
function escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary containment.
 *
 * `\b` alone is wrong at the edges of multi-word needles containing an
 * apostrophe ("sana'a"), so the boundary is asserted with explicit lookarounds
 * on characters that can be part of a place name.
 */
function containsPhrase(haystack: string, needle: string): boolean {
    if (!needle) return false;
    return new RegExp(`(^|[^a-z])${escape(needle)}([^a-z]|$)`, "i").test(haystack);
}

/**
 * Whether `text` plausibly names a place inside `country`.
 *
 * `original` is passed alongside the lowercased haystack because the country
 * code is only trusted when it appears as an uppercase standalone token — the
 * one form that is unlikely to be a fragment of an ordinary word.
 */
export function inCountry(lowered: string, original: string, country: Country): boolean {
    if (containsPhrase(lowered, country.name.toLowerCase())) return true;

    for (const alias of ALIASES[country.code] ?? []) {
        if (containsPhrase(lowered, alias)) return true;
    }

    return new RegExp(`(^|[^A-Za-z])${escape(country.code)}([^A-Za-z]|$)`).test(original);
}
