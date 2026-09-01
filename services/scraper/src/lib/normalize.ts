import type { ScrapedJob } from "../core/types.js";

/** Reads the first key that holds something, including dotted paths. */
export function pick<T = unknown>(obj: unknown, keys: string[], fallback: T): T {
    if (!obj || typeof obj !== "object") return fallback;
    for (const key of keys) {
        const value = key
            .split(".")
            .reduce<unknown>((acc, part) => (acc == null ? acc : (acc as Record<string, unknown>)[part]), obj);
        if (value !== undefined && value !== null && value !== "") return value as T;
    }
    return fallback;
}

const ENTITIES: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
    "&apos;": "'", "&nbsp;": " ", "&#x27;": "'", "&#x2F;": "/",
};

/** HTML → readable text. Job boards send markup in `description` constantly. */
export function stripHtml(input: unknown): string {
    let s = String(input ?? "");
    // Entities can be double-encoded (Arbeitnow sends `&lt;div&gt;`), so decode,
    // strip, then decode again rather than assuming a single pass is enough.
    for (let pass = 0; pass < 2; pass++) {
        s = s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#x27|#x2F);/g, (m) => ENTITIES[m] ?? m);
        s = s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
        s = s.replace(/<[^>]*>/g, " ");
    }
    return s.replace(/\s+/g, " ").trim();
}

/**
 * Display text from a field that is supposed to be plain.
 *
 * Decodes entities as well as collapsing whitespace: several feeds put raw
 * entities in fields that carry no markup, so company names were rendering as
 * "Larsen &amp; Toubro" and "JACK &amp; JONES".
 */
export function clean(input: unknown): string {
    return flatten(input)
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#x27|#x2F);/g, (m) => ENTITIES[m] ?? m)
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Keys that carry a human label on a structured value.
 *
 * Ordered so the most specific wins the de-duplication below: a place object
 * with both `name` and `city` set to different things is naming a venue inside
 * a city, and the venue is the more useful half.
 */
const LABEL_KEYS = [
    "name",
    "label",
    "text",
    "title",
    "displayName",
    "display_name",
    // Wuzzuf's own key on `workplaceArrangement` and `careerLevel`. Its mapper
    // reaches into the object directly, but a future one that passes the whole
    // object should still read as "Remote" rather than as nothing.
    "displayedName",
    "value",
    "city",
    "country",
];

/**
 * Any JSON value a source hands us, as display text.
 *
 * This exists because `String(value)` on an object produces the literal
 * `"[object Object]"` — and that string was reaching the database and then the
 * job cards. Several sources publish `location` as a structured value
 * (`{ city, country }`, or an array of places), every mapper funnels through
 * `clean`, so one blind stringification became visible everywhere.
 *
 * An object with no recognisable label flattens to empty text rather than to a
 * placeholder: a blank location is honest, and "[object Object]" is not.
 */
function flatten(input: unknown): string {
    if (input === null || input === undefined) return "";

    const type = typeof input;
    if (type === "string") return input as string;
    if (type === "number" || type === "boolean" || type === "bigint") return String(input);
    if (type === "function" || type === "symbol") return "";

    if (Array.isArray(input)) {
        return input.map(flatten).filter(Boolean).join(", ");
    }

    const record = input as Record<string, unknown>;

    /*
     * Several labelled fields at once — `{ city: "Cairo", country: "Egypt" }` —
     * read better joined than as whichever key happened to be checked first.
     */
    const parts = LABEL_KEYS.map((key) => record[key])
        .filter((value) => typeof value === "string" || typeof value === "number")
        .map((value) => String(value).trim())
        .filter(Boolean);

    // De-duplicated: `{ name: "Cairo", city: "Cairo" }` is one place, not two.
    return [...new Set(parts)].join(", ");
}

export function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) : s;
}

/**
 * Anything a job board calls a date, turned into an ISO string or null.
 *
 * Boards emit ISO strings, epoch seconds, epoch milliseconds, and — Indeed and
 * Wuzzuf especially — relative phrases like "8 days ago". `posted_at_source` is
 * a timestamptz column and the insert downstream is bulk, so a single
 * unparseable value fails an entire batch. Null is always safer than a guess.
 */
export function toTimestamp(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "number" && Number.isFinite(value)) {
        const ms = value > 1e12 ? value : value * 1000;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    const raw = String(value).trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();

    if (/^(just posted|just now|today|active today|posted today|new)$/.test(lower)) {
        return new Date().toISOString();
    }
    if (/^(yesterday|posted yesterday)$/.test(lower)) {
        return new Date(Date.now() - 864e5).toISOString();
    }

    const rel = lower.match(
        /^(?:posted\s+|active\s+)?(\d+)\+?\s*(minute|hour|day|week|month|year)s?\s+ago$/
    );
    if (rel) {
        const unit: Record<string, number> = {
            minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6,
        };
        return new Date(Date.now() - parseInt(rel[1], 10) * unit[rel[2]]).toISOString();
    }

    // A bare number as a string is ambiguous ("8" parses as a year) — reject it.
    if (/^\d{1,4}$/.test(raw)) return null;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Best guess at workplace type from whatever text the source gives us.
 *
 * Flattened through `clean` rather than `String`, so a structured
 * `workplaceArrangement` object is read for its label instead of becoming
 * "[object object]" and matching nothing.
 */
export function inferJobType(...parts: unknown[]): ScrapedJob["job_type"] {
    const text = parts.map(clean).join(" ").toLowerCase();
    if (/\bhybrid\b/.test(text)) return "hybrid";
    if (/\bremote\b|work from home|wfh|anywhere/.test(text)) return "remote";
    return "onsite";
}

/**
 * Workplace type when the source offers both a boolean and some text.
 *
 * Every source with an `isRemote` / `telecommuting` / `is_remote` flag was
 * written as `flag === true ? "remote" : inferJobType(...)`, which lets the
 * flag beat the words. That is backwards, and it is why listings showed here as
 * Remote while the original posting said Hybrid: these flags mean "not fully
 * on-site", so boards set them for hybrid roles too.
 *
 * "Hybrid" is the more specific claim, so it wins wherever it is stated. The
 * flag only decides between remote and on-site when the text says neither.
 */
export function resolveJobType(
    remoteFlag: boolean | null | undefined,
    ...parts: unknown[]
): ScrapedJob["job_type"] {
    const inferred = inferJobType(...parts);
    if (inferred === "hybrid") return "hybrid";
    if (remoteFlag === true) return "remote";
    return inferred;
}

/** Drops query strings and fragments so the same posting dedupes reliably. */
export function canonicalUrl(url: unknown): string {
    const raw = clean(url);
    if (!raw) return "";
    try {
        const u = new URL(raw);
        // Indeed and LinkedIn both carry the id in a query param, so those two
        // are kept; everything else is tracking noise.
        const keep = new URLSearchParams();
        for (const k of ["jk", "currentJobId", "gh_jid"]) {
            const v = u.searchParams.get(k);
            if (v) keep.set(k, v);
        }
        u.search = keep.toString();
        u.hash = "";
        return u.toString();
    } catch {
        return raw;
    }
}

/** Keeps the first sighting of each posting. */
export function dedupe(jobs: ScrapedJob[]): ScrapedJob[] {
    const seen = new Set<string>();
    const out: ScrapedJob[] = [];
    for (const job of jobs) {
        if (!job.apply_url || !job.title || seen.has(job.apply_url)) continue;
        seen.add(job.apply_url);
        out.push(job);
    }
    return out;
}

/**
 * Arabic text, folded so two spellings of the same word compare equal.
 *
 * Arabic job boards are inconsistent about the alef hamza forms (أ إ آ vs ا),
 * the taa marbuta (ة vs ه) and the decorative tatweel (ـ), so "مطوّر واجهات"
 * and "مطور واجهات" are the same title spelled two ways. Diacritics are
 * stripped for the same reason.
 */
export function foldArabic(input: string): string {
    return input
        .replace(/[\u0640]/g, "")                 // tatweel
        .replace(/[\u064B-\u065F\u0670]/g, "")    // harakat
        .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")  // آ أ إ ٱ → ا
        .replace(/\u0649/g, "\u064A")             // ى → ي
        .replace(/\u0629/g, "\u0647");            // ة → ه
}

/** True when the text is predominantly Arabic script. */
export function isArabic(input: string): boolean {
    const text = String(input ?? "");
    if (!text) return false;
    const arabic = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
    const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
    return arabic > latin;
}

/**
 * The comparison form for any free text this service matches on.
 *
 * One function so a query and the text it is matched against are always folded
 * the same way — matching a raw query against a folded haystack silently never
 * hits, which is the sort of bug that reads as "the source returned nothing".
 */
export function foldForMatch(input: unknown): string {
    /*
     * Tags come out first. Descriptions carry markup now that they are stored
     * as HTML rather than flattened, and without this a query for "li" would
     * match every posting with a bullet list.
     */
    return foldArabic(stripHtml(input).toLowerCase());
}

/** The registrable domain, lowercased and without `www.`; "" if unparseable. */
export function hostOf(url: unknown): string {
    const raw = clean(url);
    if (!raw) return "";
    try {
        return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
}
