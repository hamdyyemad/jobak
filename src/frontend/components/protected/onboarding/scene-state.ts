import type { OnboardingData } from "@/frontend/types/on-boarding";
import { countryName } from "@/frontend/lib/configs/countries";
import { aiProviderOptions, seniorityFromExperience, seniorityOptions, workOptions } from "./data";

export interface ReadoutRow {
    /** The step this line belongs to, so the panel can mark the live one. */
    step: number;
    label: string;
    value: string;
}

export interface SceneState {
    /** ISO country code to sample the tint from, or null for no flag. */
    countryCode: string | null;
    /** Brand hex that overrides the flag tint — the credentials step only. */
    tintOverride: string | null;
    /** Orbits drawn around the object: one per question answered. */
    rings: number;
    /** Draws the object as a wireframe globe rather than a solid body. */
    wireframe: boolean;
    /** Big mono line under the object. */
    caption: string;
    readout: ReadoutRow[];
}

const EMPTY = "—";

function workLabel(data: OnboardingData): string {
    if (data.workPreference.length === 0) return EMPTY;
    return data.workPreference
        .map((value) => workOptions.find((o) => o.value === value)?.label ?? value)
        .join(" · ");
}

function whereLabel(data: OnboardingData): string {
    if (data.location.worldwide) return "Worldwide";
    const { countries } = data.location;
    if (countries.length === 0) return EMPTY;
    if (countries.length === 1) return countryName(countries[0]);
    // Naming every country overflows the readout column; the first plus a count
    // stays legible and still says how wide the search is.
    return `${countryName(countries[0])} +${countries.length - 1}`;
}

/**
 * `label` is resolved by the caller rather than looked up here: the catalogue
 * lives in the database now, and this module has to stay synchronous and
 * client-safe.
 */
function fieldValue(data: OnboardingData, label: string): string {
    if (!data.field) return EMPTY;
    const level = seniorityOptions.find(
        (o) => o.value === (data.seniority ?? seniorityFromExperience(data.experience))
    );
    return data.experience > 0 ? `${label} · ${level?.label}` : label;
}

function roleValue(data: OnboardingData): string {
    if (data.jobTitles.length === 0 && data.jobType.length === 0) return EMPTY;
    if (data.jobTitles.length === 0) return `${data.jobType.length} type(s)`;
    if (data.jobTitles.length === 1) return data.jobTitles[0];
    return `${data.jobTitles[0]} +${data.jobTitles.length - 1}`;
}

function aiValue(data: OnboardingData): string {
    if (data.aiProviders.length === 0) return EMPTY;
    return data.aiProviders
        .map((p) => aiProviderOptions.find((o) => o.value === p)?.label ?? p)
        .join(" · ");
}

/**
 * Everything the scene needs, derived from the answers so far.
 *
 * Kept in one place rather than threaded through each step, because the whole
 * point is that the scene reacts to the *form*, not to whichever step happens to
 * be on screen — the readout keeps every earlier answer visible while you work.
 */
export function sceneState(data: OnboardingData, step: number, fieldLabel: string): SceneState {
    const readout: ReadoutRow[] = [
        { step: 1, label: "Mode", value: workLabel(data) },
        { step: 2, label: "Where", value: whereLabel(data) },
        { step: 3, label: "Field", value: fieldValue(data, fieldLabel) },
        { step: 4, label: "Role", value: roleValue(data) },
        { step: 5, label: "AI", value: aiValue(data) },
    ];

    const rings = readout.filter((row) => row.value !== EMPTY).length;

    // Step 5 hands the scene over to the provider's own colour; step 2 to the
    // flag. Everywhere else the scene keeps the product's accent.
    const tintOverride =
        step === 5 && data.aiProviders.length > 0
            ? aiProviderOptions.find((o) => o.value === data.aiProviders[data.aiProviders.length - 1])?.tint ?? null
            : null;

    const captions: Record<number, string> = {
        1: data.workPreference.length ? workLabel(data) : "Select a mode",
        2: whereLabel(data) === EMPTY ? "Anywhere yet" : whereLabel(data),
        3: data.field ? fieldValue(data, fieldLabel) : "Choose a field",
        4: roleValue(data) === EMPTY ? "Pick your roles" : roleValue(data),
        5: aiValue(data) === EMPTY ? "Connect a provider" : aiValue(data),
    };

    return {
        // The first pick drives the tint: a scene cannot be several flags at
        // once, and the first one chosen is the one the user thought of first.
        countryCode: data.location.worldwide ? null : data.location.countries[0] || null,
        tintOverride,
        rings,
        wireframe: data.location.worldwide,
        caption: captions[step] ?? "",
        readout,
    };
}
