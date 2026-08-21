import type { OnboardingData } from "@/frontend/types/on-boarding";

export type StepCheck = { ok: true } | { ok: false; message: string };

const OK: StepCheck = { ok: true };

/**
 * What each step needs before the flow will move on.
 *
 * Kept out of the step components because the guard belongs to the flow, not to
 * whichever pane happens to be mounted — the navigation asks this, and the step
 * only renders whatever answer comes back.
 *
 * The messages name the missing thing rather than saying "invalid", because the
 * user's next action should be obvious from the sentence alone.
 */
export function validateStep(data: OnboardingData, step: number): StepCheck {
    switch (step) {
        case 1:
            return data.workPreference.length > 0
                ? OK
                : { ok: false, message: "Pick at least one work arrangement." };

        case 2:
            // Worldwide is a complete answer on its own; a specific search is not
            // complete until it names somewhere.
            if (data.location.worldwide) return OK;
            return data.location.countries.length > 0
                ? OK
                : { ok: false, message: "Select at least one country, or switch to worldwide." };

        case 3:
            if (!data.field) return { ok: false, message: "Choose the field you work in." };
            if (data.skills.length === 0) {
                return { ok: false, message: "Add at least one skill." };
            }
            if (data.experience <= 0) {
                return { ok: false, message: "Enter your years of experience." };
            }
            return OK;

        case 4:
            if (data.jobType.length === 0) {
                return { ok: false, message: "Pick at least one engagement type." };
            }
            return data.jobTitles.length > 0
                ? OK
                : { ok: false, message: "Add at least one job title you're targeting." };

        default:
            // Step 5 is the credentials step; the finish button has its own gate
            // (one verified model key — Apify is optional).
            return OK;
    }
}
