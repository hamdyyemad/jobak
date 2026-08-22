import { useState } from "react";
import type { MarketingAnswers } from "@/frontend/types/on-boarding";

const initialAnswers: MarketingAnswers = {
    heardFrom: "",
    heardDetail: "",
    goal: "",
    searchStatus: "",
};

/**
 * Held apart from `useOnboardingForm` on purpose.
 *
 * That hook's state is the payload posted to the collector; this one never
 * leaves the marketing endpoint. Keeping them separate is what stops an
 * attribution answer from turning up in an n8n execution log.
 */
export function useMarketingAnswers() {
    const [answers, setAnswers] = useState<MarketingAnswers>(initialAnswers);

    const updateAnswers = (updates: Partial<MarketingAnswers>) => {
        setAnswers((prev) => ({ ...prev, ...updates }));
    };

    return { answers, updateAnswers };
}
