import type { Country, RegionTag } from "../core/types.js";

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

/* ────────────────────────────────────────────────────────────────────────────
 * Regions
 *
 * Remote postings name regions far more often than countries — "EMEA", "LATAM",
 * "Europe", "Americas" — so eligibility has to be answerable at this
 * granularity. Below country level there is nothing to decide; above it, these
 * seven tags cover every grouping the sampled listings actually used.
 * ────────────────────────────────────────────────────────────────────────── */

/** The market Jobak is built for. Arab League plus the Maghreb, by ISO code. */
export const MENA = new Set([
    "AE", "BH", "DJ", "DZ", "EG", "IQ", "JO", "KM", "KW", "LB", "LY", "MA",
    "MR", "OM", "PS", "QA", "SA", "SD", "SO", "SY", "TN", "YE",
]);

const REGION_MEMBERS: Record<RegionTag, string[]> = {
    mena: [...MENA],
    africa: [
        "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ",
        "DZ", "EG", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "KE", "KM",
        "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE",
        "NG", "RW", "SC", "SD", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TG",
        "TN", "TZ", "UG", "ZA", "ZM", "ZW",
    ],
    europe: [
        "AL", "AD", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK",
        "EE", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI",
        "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT",
        "RO", "RS", "RU", "SE", "SI", "SK", "SM", "UA", "XK",
    ],
    "north-america": ["CA", "US", "MX"],
    latam: [
        "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "MX",
        "NI", "PA", "PE", "PR", "PY", "SV", "UY", "VE",
    ],
    apac: [
        "AU", "BD", "BN", "CN", "HK", "ID", "IN", "JP", "KH", "KR", "LA", "LK",
        "MM", "MN", "MY", "NP", "NZ", "PH", "PK", "SG", "TH", "TW", "VN",
    ],
    oceania: ["AU", "FJ", "NZ", "PG", "SB", "VU", "WS"],
};

const REGIONS_BY_CODE = new Map<string, RegionTag[]>();
for (const [tag, codes] of Object.entries(REGION_MEMBERS) as [RegionTag, string[]][]) {
    for (const code of codes) {
        REGIONS_BY_CODE.set(code, [...(REGIONS_BY_CODE.get(code) ?? []), tag]);
    }
}

/** Which regions a country belongs to. Egypt is both `mena` and `africa`. */
export function regionsOf(code: string): RegionTag[] {
    return REGIONS_BY_CODE.get(code.toUpperCase()) ?? [];
}

export function isMena(code: string): boolean {
    return MENA.has(code.toUpperCase());
}

/**
 * Every ISO-3166 country name, mapped back to its code.
 *
 * Built from `Intl.DisplayNames` rather than hand-listed: the runtime already
 * ships the whole table, and a hand-written gazetteer is a list that goes stale
 * and that nobody notices is missing an entry until a market returns nothing.
 */
const CODE_BY_NAME = (() => {
    const map = new Map<string, string>();
    let display: Intl.DisplayNames | null = null;
    try {
        display = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
        return map;
    }

    const A = "A".charCodeAt(0);
    for (let i = 0; i < 26; i++) {
        for (let j = 0; j < 26; j++) {
            const code = String.fromCharCode(A + i, A + j);
            let name: string | undefined;
            try {
                name = display.of(code);
            } catch {
                continue;
            }
            // `of` echoes the code back for the ~450 pairs that are not countries.
            if (!name || name === code) continue;
            map.set(name.toLowerCase(), code);
        }
    }
    return map;
})();

/** Common names and demonyms the ISO table does not carry. */
const NAME_ALIASES: Record<string, string> = {
    usa: "US", "u.s.": "US", "u.s.a.": "US", america: "US", "united states of america": "US",
    uk: "GB", "u.k.": "GB", britain: "GB", "great britain": "GB", england: "GB",
    deutschland: "DE", germany: "DE", holland: "NL", nederland: "NL",
    uae: "AE", "u.a.e.": "AE", emirates: "AE", ksa: "SA", "saudi": "SA",
    egypte: "EG", masr: "EG", maroc: "MA", tunisie: "TN", algerie: "DZ",
};

/**
 * Cities outside MENA that these feeds actually name.
 *
 * Not a gazetteer — a list of the places that turned up in a measured run and
 * classified as "unknown" because nothing recognised them. `New York, NY (HQ)`,
 * `Boston`, `Redwood City`, `Coimbatore South` and `Dehradun` were all being
 * kept as location-unknown remote roles on that basis, which is the same
 * failure as before wearing a different hat: a role at a New York HQ is not
 * open to a candidate in Cairo just because nobody wrote "United States".
 *
 * Extend it when the probe's location histogram shows a new city sitting in the
 * unknown bucket.
 */
const WORLD_CITIES: Record<string, string[]> = {
    US: [
        "new york", "nyc", "brooklyn", "san francisco", "sf bay area", "bay area",
        "boston", "seattle", "austin", "chicago", "los angeles", "san diego",
        "denver", "atlanta", "miami", "dallas", "houston", "philadelphia",
        "palo alto", "redwood city", "mountain view", "sunnyvale", "san jose",
        "cambridge ma", "washington dc", "portland",
    ],
    CA: ["toronto", "vancouver", "montreal", "ottawa", "calgary", "waterloo"],
    GB: ["london", "manchester", "edinburgh", "birmingham", "bristol", "glasgow", "leeds"],
    DE: ["berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln", "düsseldorf", "stuttgart"],
    NL: ["amsterdam", "rotterdam", "utrecht", "eindhoven", "the hague"],
    FR: ["paris", "lyon", "marseille", "toulouse", "bordeaux", "lille"],
    IE: ["dublin", "cork", "galway"],
    ES: ["madrid", "barcelona", "valencia", "seville", "malaga"],
    PT: ["lisbon", "lisboa", "porto", "braga"],
    PL: ["warsaw", "warszawa", "krakow", "kraków", "wroclaw", "gdansk"],
    IN: [
        "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "gurgaon",
        "gurugram", "noida", "hyderabad", "pune", "chennai", "kolkata",
        "ahmedabad", "coimbatore", "dehradun", "jaipur", "indore", "kochi",
    ],
    SG: ["singapore"],
    AU: ["sydney", "melbourne", "brisbane", "perth", "canberra"],
    NZ: ["auckland", "wellington", "christchurch"],
    JP: ["tokyo", "osaka", "kyoto", "yokohama"],
    KR: ["seoul", "busan"],
    CN: ["beijing", "shanghai", "shenzhen", "guangzhou", "hangzhou"],
    BR: ["sao paulo", "são paulo", "rio de janeiro", "belo horizonte", "curitiba"],
    MX: ["mexico city", "guadalajara", "monterrey"],
    AR: ["buenos aires", "cordoba", "rosario"],
    NG: ["lagos", "abuja", "ibadan"],
    KE: ["nairobi", "mombasa"],
    ZA: ["cape town", "johannesburg", "durban", "pretoria"],
    IL: ["tel aviv", "jerusalem", "haifa"],
    TR: ["istanbul", "ankara", "izmir"],
    UA: ["kyiv", "kiev", "lviv", "odesa"],
    PH: ["manila", "cebu", "makati", "quezon city"],
    ID: ["jakarta", "bandung", "surabaya"],
    VN: ["hanoi", "ho chi minh", "saigon", "da nang"],
    PK: ["karachi", "lahore", "islamabad"],
    BD: ["dhaka", "chittagong"],
};

/**
 * US and Canadian postal abbreviations, matched only in the `City, XX` form.
 *
 * Bare two-letter matching is the bug this module was written to prevent, but
 * an uppercase pair immediately after a comma is a different thing entirely:
 * it is how North American addresses are written and essentially nothing else.
 */
const SUBDIVISIONS: Record<string, string> = Object.fromEntries([
    ...["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
        "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
        "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
        "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
        "WI", "WY", "DC"].map((code) => [code, "US"]),
    ...["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK"].map((code) => [code, "CA"]),
]);

/**
 * The country a fragment of free text names, if any.
 *
 * Matched on word boundaries against names and known cities — never a bare
 * two-letter code, which is exactly the substring bug this module exists to
 * prevent ("ger**ma**ny" is not Morocco). The one exception is a subdivision
 * code in `City, XX` position, which is unambiguous.
 */
export function countryFromText(text: string): string | null {
    const lowered = text.toLowerCase();

    for (const [alias, code] of Object.entries(NAME_ALIASES)) {
        if (containsPhrase(lowered, alias)) return code;
    }
    for (const [name, code] of CODE_BY_NAME) {
        if (name.length > 3 && containsPhrase(lowered, name)) return code;
    }
    for (const [code, aliases] of Object.entries(ALIASES)) {
        if (aliases.some((alias) => containsPhrase(lowered, alias))) return code;
    }
    for (const [code, cities] of Object.entries(WORLD_CITIES)) {
        if (cities.some((city) => containsPhrase(lowered, city))) return code;
    }

    const subdivision = text.match(/,\s*([A-Z]{2})(?![A-Za-z])/);
    if (subdivision && SUBDIVISIONS[subdivision[1]]) return SUBDIVISIONS[subdivision[1]];

    return null;
}
