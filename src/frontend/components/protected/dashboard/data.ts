/**
 * Chip colours per source.
 *
 * Keyed by display name so a source the collectors add later still renders —
 * with the neutral fallback rather than borrowing another source's colour.
 * The filter row itself is built from the jobs actually on screen, so there is
 * no hardcoded source list to drift out of date.
 */
const SOURCE_COLORS: Record<string, string> = {
    LinkedIn: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "LinkedIn (via Apify)": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Indeed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Indeed (via Apify)": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    RemoteOK: "bg-green-500/10 text-green-400 border-green-500/20",
    Wuzzuf: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Remotive: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    Arbeitnow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Jobicy: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    Himalayas: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "We Work Remotely": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Greenhouse: "bg-lime-500/10 text-lime-400 border-lime-500/20",
    Ashby: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Workable: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const FALLBACK = "bg-white/5 text-(--fg-tertiary) border-border-standard";

export function sourceColor(source: string): string {
    return SOURCE_COLORS[source] ?? FALLBACK;
}
