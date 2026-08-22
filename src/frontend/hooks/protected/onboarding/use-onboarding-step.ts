import { useState, useMemo } from "react";

/*
 * Five questions, then the marketing step.
 *
 * Five, since salary expectations were dropped: the range was self-reported,
 * rarely matched what a posting actually advertised, and the model scored better
 * without it than with a number it had to second-guess.
 *
 * Step six is not a question the search needs — it is what the user does while
 * the search runs, so it sits after the submit rather than before it.
 */
const SUBMIT_STEP = 5;
const TOTAL_STEPS = 6;

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
    /** The step whose action kicks the search off, not the last step any more. */
    const isSubmitStep = step === SUBMIT_STEP;

    return {
        step,
        totalSteps: TOTAL_STEPS,
        progress,
        direction,
        handleNext,
        handleBack,
        isFirstStep,
        isLastStep,
        isSubmitStep,
    };
}
