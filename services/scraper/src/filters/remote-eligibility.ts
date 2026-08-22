/**
 * "Remote" and "remote, and they will hire you" are not the same claim.
 *
 * The previous gate treated them as one — `if (job.job_type === "remote")
 * return true` — and that single line is why a search from Cairo returned
 * `Remote Deutschland`, `Remote (UTC+1 to UTC+2)`, `Americas, Europe, Israel`,
 * `LATAM` and `Europe, Norway`. Every one of those is genuinely remote. None of
 * them is open to a candidate in MENA.
 *
 * So a remote posting's location text is parsed into the hiring window it
 * actually describes, and eligibility becomes an overlap test against the
 * markets the search asked for.
 */

import type { RegionTag, RemoteScope, SearchContext } from "../core/types.js";
import { countryFromText, regionsOf } from "../lib/geo.js";
import { clean } from "../lib/normalize.js";

/**
 * Phrases that mean "we do not care where you are".
 *
 * Deliberately narrow. "Remote" on its own is *not* here: it is the single most
 * common value in the pool and it says nothing either way, so reading it as
 * worldwide would re-introduce the bug this module fixes.
 */
const WORLDWIDE = [
    "anywhere in the world", "anywhere in world", "work from anywhere",
    "worldwide", "world wide", "globally", "global remote", "any country",
    "anywhere", "global", "international", "no location restriction",
    "location independent", "any timezone", "all timezones",
];

/** Location text that carries no geographic signal at all. */
const NO_SIGNAL = [
    "", "remote", "remote job", "remote work", "fully remote", "100% remote",
    "not specified", "n/a", "none", "unknown", "various", "multiple locations",
];

/** Groupings a posting names instead of a country. */
const REGION_WORDS: [RegExp, RegionTag[]][] = [
    [/\bemea\b/, ["europe", "mena", "africa"]],
    [/\bmena\b|\bmiddle east\b|\bgcc\b|\bgulf\b|\barab\b/, ["mena"]],
    [/\bafrica\b/, ["africa", "mena"]],
    [/\beurope\b|\beuropean union\b|\bschengen\b|\beea\b/, ["europe"]],
    [/\blatam\b|\blatin america\b|\bsouth america\b|\bcentral america\b/, ["latam"]],
    [/\bapac\b|\basia[- ]pacific\b|\bsoutheast asia\b|\bse asia\b|\basia\b/, ["apac"]],
    [/\bamericas\b/, ["north-america", "latam"]],
    [/\bnorth america\b|\bnoram\b|\bus timezones?\b|\busa timezones?\b/, ["north-america"]],
    [/\boceania\b|\banz\b/, ["oceania"]],
];

/**
 * UTC offsets a posting will accept, from any of the forms they get written in:
 * "UTC+1 to UTC+2", "GMT-5", "UTC+1..+3", "CET", "EST".
 */
function offsetsFrom(text: string): number[] {
    const offsets: number[] = [];

    for (const match of text.matchAll(/\b(?:utc|gmt)\s*([+-])\s*(\d{1,2})/g)) {
        offsets.push((match[1] === "-" ? -1 : 1) * Number(match[2]));
    }

    // Named zones, as commonly abbreviated in postings.
    const NAMED: [RegExp, number][] = [
        [/\bcet\b|\bcest\b/, 1],
        [/\beet\b|\beest\b/, 2],
        [/\bbst\b/, 1],
        [/\bgmt\b(?!\s*[+-])/, 0],
        [/\best\b|\bedt\b/, -5],
        [/\bcst\b|\bcdt\b/, -6],
        [/\bmst\b/, -7],
        [/\bpst\b|\bpdt\b/, -8],
        [/\bist\b/, 5],
    ];
    for (const [pattern, offset] of NAMED) {
        if (pattern.test(text)) offsets.push(offset);
    }

    // A stated range covers everything between its ends.
    if (offsets.length >= 2 && /\bto\b|\.\.|–|—|-/.test(text)) {
        const low = Math.min(...offsets);
        const high = Math.max(...offsets);
        for (let o = low; o <= high; o++) if (!offsets.includes(o)) offsets.push(o);
    }

    return offsets;
}

/** Which regions sit inside a given UTC offset. Coarse on purpose — a band is coarse. */
function regionsForOffset(offset: number): RegionTag[] {
    if (offset >= 1 && offset <= 4) return ["mena", "africa", "europe"];
    if (offset === 0) return ["europe", "africa", "mena"];
    if (offset >= 5 && offset <= 12) return ["apac", "oceania"];
    if (offset <= -3 && offset >= -10) return ["north-america", "latam"];
    return [];
}

/**
 * Restrictions stated in prose rather than in the location field.
 *
 * A posting whose location says only "Remote" while its description opens with
 * "candidates must be based in the United States" is not unknown — it is
 * restricted, and that sentence is where it says so. Kept to the few phrasings
 * that are unambiguous; anything looser starts discarding real matches.
 */
const PROSE_RESTRICTION =
    /\b(?:must (?:be|reside)|only open to|candidates? must be)\b[^.]{0,60}?\b(?:based|located|residing|resident|authori[sz]ed to work|eligible to work)\b[^.]{0,60}/gi;

function prosePhrases(description: string): string[] {
    return (description.match(PROSE_RESTRICTION) ?? []).map((s) => s.toLowerCase());
}

/**
 * The hiring window a remote posting describes.
 *
 * `restricted` is only ever returned when something concrete was recognised —
 * a country, a region, or a timezone band. Text that recognises as nothing is
 * `unknown`, never `restricted`, because "we could not read it" and "they will
 * not hire you" are different answers and only one of them justifies dropping
 * a row.
 */
export function classifyScope(locationText: unknown, description = ""): RemoteScope {
    /*
     * Case is carried through deliberately. `countryFromText` reads `City, NY`
     * as the United States, and that signal only exists in the original casing
     * — lowercasing here is what left "New York, NY (HQ)" classified as unknown
     * and therefore kept.
     */
    const original = clean(locationText);
    const text = original.toLowerCase();

    if (NO_SIGNAL.includes(text)) {
        const prose = prosePhrases(description);
        if (prose.length === 0) return { kind: "unknown" };
        return fromFragments(prose, { kind: "unknown" });
    }

    if (WORLDWIDE.some((phrase) => text.includes(phrase))) return { kind: "worldwide" };

    /*
     * "Remote — Europe" and "Anywhere in LATAM" both put the real answer after
     * a separator, so the text is read as a list of independent claims rather
     * than as one phrase.
     */
    const fragments = original
        .split(/[,;/|]|\s+(?:and|or|&|\+)\s+/)
        .map((fragment) => fragment.trim())
        .filter(Boolean);

    /*
     * The comma split throws away the `City, NY` pairing, so the whole string
     * is offered alongside the fragments — one of them will recognise it.
     */
    return fromFragments([original, ...fragments, ...prosePhrases(description)], { kind: "unknown" });
}

function fromFragments(fragments: string[], fallback: RemoteScope): RemoteScope {
    const countries = new Set<string>();
    const regions = new Set<RegionTag>();

    for (const fragment of fragments) {
        // The word-level patterns below are written lowercase; the country
        // matcher needs the original casing. Both get what they expect.
        const lowered = fragment.toLowerCase();

        if (WORLDWIDE.some((phrase) => lowered.includes(phrase))) return { kind: "worldwide" };

        for (const [pattern, tags] of REGION_WORDS) {
            if (pattern.test(lowered)) tags.forEach((tag) => regions.add(tag));
        }

        for (const offset of offsetsFrom(lowered)) {
            regionsForOffset(offset).forEach((tag) => regions.add(tag));
        }

        const code = countryFromText(fragment);
        if (code) countries.add(code);
    }

    if (countries.size === 0 && regions.size === 0) return fallback;
    return { kind: "restricted", countries, regions };
}

/**
 * Would a candidate in one of this search's markets be considered?
 *
 * `unknown` passes. That is a deliberate recall decision, not an oversight: the
 * single most common location value across these feeds is a bare "Remote", the
 * AI scorer downstream is what actually decides what a user sees, and
 * `remote_scope` is carried on every row so a stricter consumer can narrow it
 * without parsing the text again. Set `strictRemote` to drop them.
 */
export function isReachable(scope: RemoteScope, ctx: SearchContext, strictRemote = false): boolean {
    if (scope.kind === "worldwide") return true;
    if (scope.kind === "unknown") return !strictRemote;

    /*
     * A worldwide search that names no country is asking for roles open to
     * everyone. A role restricted to any list at all — however long — is not
     * that, so this is the one case where `restricted` is always a no.
     */
    if (ctx.worldwide && ctx.countries.length === 0) return false;

    return ctx.countries.some(
        (country) =>
            scope.countries.has(country.code) ||
            regionsOf(country.code).some((tag) => scope.regions.has(tag))
    );
}
