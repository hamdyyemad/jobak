import type { ScrapedJob } from "./types.js";

export const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
    return String(input ?? "")
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp|#x27|#x2F);/g, (m) => ENTITIES[m] ?? m)
        .replace(/\s+/g, " ")
        .trim();
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

/** Best guess at workplace type from whatever text the source gives us. */
export function inferJobType(...parts: unknown[]): ScrapedJob["job_type"] {
    const text = parts.map((p) => String(p ?? "")).join(" ").toLowerCase();
    if (/\bhybrid\b/.test(text)) return "hybrid";
    if (/\bremote\b|work from home|wfh|anywhere/.test(text)) return "remote";
    return "onsite";
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

/** Shared fetch with a caller-controlled abort and a browser-ish User-Agent. */
export async function fetchText(url: string, signal: AbortSignal, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
        signal,
        headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "en-US,en;q=0.9", ...headers },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
}

export async function fetchJson<T>(url: string, signal: AbortSignal, headers: Record<string, string> = {}) {
    return JSON.parse(await fetchText(url, signal, headers)) as T;
}
