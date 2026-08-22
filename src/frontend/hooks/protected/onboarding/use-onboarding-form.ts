import { useState } from "react";
import { OnboardingData } from "@/frontend/types/on-boarding";

const initialData: OnboardingData = {
    workPreference: [],
    location: { countries: [], worldwide: false },
    field: "",
    skills: [],
    experience: 0,
    jobType: [],
    jobTitles: [],
    // null until the user overrides it — otherwise the value derived from
    // `experience` is what gets submitted.
    seniority: null,
    aiProviders: [],
    aiKeys: {},
    apifyKey: "",
};

/**
 * `initial` is the saved profile when this is being used as Settings.
 *
 * Keys are deliberately absent from it: `aiKeys` and `apifyKey` always start
 * empty, and blank means "keep what is stored" rather than "clear it".
 */
export function useOnboardingForm(initial?: Partial<OnboardingData>) {
    const [data, setData] = useState<OnboardingData>({ ...initialData, ...initial });

    const updateData = (updates: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    return { data, updateData, setData };
}
