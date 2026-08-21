import { useState, useMemo } from "react";

/*
 * Five, since salary expectations were dropped: the range was self-reported,
 * rarely matched what a posting actually advertised, and the model scored better
 * without it than with a number it had to second-guess.
 */
const TOTAL_STEPS = 5;

export type StepDirection = "forward" | "back";

export function useOnboardingStep() {
    const [step, setStep] = useState(1);
    // Which way the last move went, so the transition can travel with the user
    const [direction, setDirection] = useState<StepDirection>("forward");

    const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setDirection("forward");
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setDirection("back");
            setStep(step - 1);
        }
    };

    const isFirstStep = step === 1;
    const isLastStep = step === TOTAL_STEPS;

    return {
        step,
        totalSteps: TOTAL_STEPS,
        progress,
        direction,
        handleNext,
        handleBack,
        isFirstStep,
        isLastStep,
    };
}
