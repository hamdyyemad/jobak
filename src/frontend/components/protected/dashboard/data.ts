/**
 * Source identity, as a hue rather than a filled pill.
 *
 * This file used to hold fourteen hardcoded Tailwind colour pairs — a blue
 * background, blue text and blue border for LinkedIn, purple for Indeed, and so
 * on down the list. Two problems with that. It made the job list very loud for
 * information that is secondary to the match itself, and every collector added
 * later needed either a fifteenth hardcoded entry or the grey fallback, so the
 * set could not stay coherent as the source list grew.
 *
 * Now a source resolves to one token from the ramp and the chip renders it as a
 * 5px dot. Known sources keep a stable, deliberate hue; anything new hashes
 * into the same ramp and looks native immediately.
 */
const RAMP = [
    "var(--hue-1)",
    "var(--hue-2)",
    "var(--hue-3)",
    "var(--hue-4)",
    "var(--hue-5)",
    "var(--hue-6)",
    "var(--hue-7)",
    "var(--hue-8)",
] as const;

/**
 * Pinned hues for the sources we already collect, so they do not shuffle when
 * the ramp changes. Keyed by display name, and the Apify variants deliberately
 * share a hue with their direct counterpart — they are the same job board.
 */
const PINNED: Record<string, number> = {
    LinkedIn: 0,
    "LinkedIn (via Apify)": 0,
    Indeed: 1,
    "Indeed (via Apify)": 1,
    RemoteOK: 2,
    Wuzzuf: 3,
    Remotive: 5,
    Arbeitnow: 6,
    Jobicy: 4,
    Himalayas: 0,
    "We Work Remotely": 5,
    Greenhouse: 6,
    Ashby: 1,
    Workable: 7,
};

/** Stable, order-independent hash so an unknown source keeps one hue. */
function hashIndex(source: string): number {
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return hash % RAMP.length;
}

/** The dot colour for a source. Always resolves — there is no grey fallback. */
export function sourceHue(source: string): string {
    const pinned = PINNED[source];
    return RAMP[pinned ?? hashIndex(source)];
}
