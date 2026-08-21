import { useState } from "react";
import { OnboardingData } from "@/frontend/types/on-boarding";

const initialData: OnboardingData = {
    workPreference: [],
    location: { country: "", worldwide: false },
    field: "",
    skills: [],
    experience: 0,
    jobType: [],
    jobTitles: [],
    // null until the user overrides it — otherwise the value derived from
    // `experience` is what gets submitted.
    seniority: null,
    salary: { min: 0, max: 0, currency: "USD" },
    aiProviders: [],
    aiKeys: {},
    apifyKey: "",
};

export function useOnboardingForm() {
    const [data, setData] = useState<OnboardingData>(initialData);

    const updateData = (updates: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    return { data, updateData, setData };
}
