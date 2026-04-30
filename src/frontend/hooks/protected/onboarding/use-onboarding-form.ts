import { useState } from "react";
import { OnboardingData } from "@/frontend/types/on-boarding";

const initialData: OnboardingData = {
    workPreference: null,
    location: { country: "", city: "" },
    field: "",
    skills: [],
    experience: 0,
    jobType: [],
    seniority: null,
    salary: { min: 0, max: 0, currency: "USD" },
    apiKey: "",
};

export function useOnboardingForm() {
    const [data, setData] = useState<OnboardingData>(initialData);

    const updateData = (updates: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    return { data, updateData, setData };
}
