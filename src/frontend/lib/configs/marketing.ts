/**
 * The attribution questions, asked on the last onboarding step.
 *
 * They run while the first collection is already going, so none of them block
 * anything and all of them are optional — the search has started either way.
 * Shared between the step UI and the API route so the accepted values are
 * defined once rather than validated against a second, drifting copy.
 */

export interface MarketingOption {
    value: string;
    label: string;
}

export const heardFromOptions: MarketingOption[] = [
    { value: "friend", label: "A friend or colleague" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "x", label: "X / Twitter" },
    { value: "youtube", label: "YouTube" },
    { value: "reddit", label: "Reddit" },
    { value: "search", label: "Google or another search" },
    { value: "facebook", label: "Facebook" },
    { value: "other", label: "Somewhere else" },
];

export const goalOptions: MarketingOption[] = [
    { value: "first-job", label: "Land my first role" },
    { value: "better-role", label: "Move to a better role" },
    { value: "higher-salary", label: "Increase my salary" },
    { value: "remote-work", label: "Find remote work" },
    { value: "career-change", label: "Change career" },
    { value: "exploring", label: "Just seeing what's out there" },
];

export const searchStatusOptions: MarketingOption[] = [
    { value: "not-started", label: "Haven't started yet" },
    { value: "just-started", label: "Just started looking" },
    { value: "actively-applying", label: "Applying actively" },
    { value: "interviewing", label: "Interviewing" },
    { value: "offer-stage", label: "Weighing an offer" },
];

/** Free text cap, matched by the API so the column can never be used as storage. */
export const HEARD_DETAIL_MAX = 200;

const allowed = {
    heard_from: new Set(heardFromOptions.map((o) => o.value)),
    goal: new Set(goalOptions.map((o) => o.value)),
    search_status: new Set(searchStatusOptions.map((o) => o.value)),
} as const;

/**
 * Keeps an unrecognised value out of the column rather than rejecting the
 * submission. A stale option in an old client should lose one answer, not the
 * whole form — nothing here is worth an error message to the user.
 */
export function cleanMarketingChoice(
    field: keyof typeof allowed,
    value: unknown
): string | null {
    return typeof value === "string" && allowed[field].has(value) ? value : null;
}
