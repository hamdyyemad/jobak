import { useState, useMemo } from "react";

const TOTAL_STEPS = 6;

export function useOnboardingStep() {
    const [step, setStep] = useState(1);

    const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const isFirstStep = step === 1;
    const isLastStep = step === TOTAL_STEPS;

    return {
        step,
        totalSteps: TOTAL_STEPS,
        progress,
        handleNext,
        handleBack,
        isFirstStep,
        isLastStep,
    };
}
