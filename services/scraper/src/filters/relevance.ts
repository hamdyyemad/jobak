import { foldForMatch } from "../lib/normalize.js";

/**
 * Does this posting plausibly answer the query?
 *
 * Most of these feeds support no server-side search at all — `?search=`, `?tag=`
 * and friends are accepted and silently ignored — so matching happens here,
 * against a feed of only the few hundred most recent postings.
 *
 * Requiring every query word to appear was too strict at that pool size:
 * "Backend Engineer" returned nothing while the feed held plenty of relevant
 * work. A hit on the title, or the full phrase anywhere, is the better trade —
 * recall matters more here because the AI scorer downstream does the precise
 * filtering and is the thing that actually decides what the user sees.
 *
 * Both sides are folded through `foldForMatch`, so an Arabic query spelled with
 * hamza still matches a title spelled without one.
 */
export function matchesQuery(query: string, title: unknown, ...rest: unknown[]): boolean {
    const needle = foldForMatch(query);
    if (!needle) return true;

    const titleText = foldForMatch(title);
    const allText = [titleText, ...rest.map(foldForMatch)].join(" ");

    const words = needle.split(/\s+/).filter((word) => word.length > 2);

    /*
     * A single-word query must hit the TITLE. Allowing "engineer" to match
     * anywhere pulled in "Laborer" and "Store Manager" — every job description
     * mentions engineers somewhere, so body text carries almost no signal for
     * one common word.
     */
    if (words.length <= 1) return titleText.includes(needle);

    // A multi-word phrase appearing intact is unambiguous wherever it sits.
    if (allText.includes(needle)) return true;

    // Otherwise: any meaningful word in the title, or every word somewhere.
    return words.some((word) => titleText.includes(word)) || words.every((word) => allText.includes(word));
}
