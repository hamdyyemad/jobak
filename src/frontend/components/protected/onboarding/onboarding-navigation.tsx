import { ArrowLeft, ArrowRight } from "lucide-react";

interface OnboardingNavigationProps {
  step: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  /** Blocks the final action until at least one AI key has been verified. */
  canSubmit: boolean;
  submitHint?: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/**
 * The bottom rail.
 *
 * Progress reads as a row of ticks rather than a hairline bar — a discrete count
 * suits a six-step flow better than a continuous fill, and it gives the frame the
 * instrument-panel quality both reference sites get from their pinned micro-type.
 */
export function OnboardingNavigation({
  step,
  totalSteps,
  isFirstStep,
  isLastStep,
  isSubmitting,
  canSubmit,
  submitHint,
  onBack,
  onNext,
  onSubmit,
}: OnboardingNavigationProps) {
  return (
    <footer className="relative z-10 border-t border-border-subtle">
      <div className="mx-auto flex max-w-350 items-center justify-between gap-6 px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className={`flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors ${
            isFirstStep
              ? "cursor-not-allowed text-(--fg-quaternary)/40"
              : "text-(--fg-tertiary) hover:text-(--fg-primary)"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="flex items-center gap-4">
          <div
            className="rail-meter"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Onboarding progress"
          >
            {Array.from({ length: totalSteps }, (_, i) => (
              <span key={i} className="rail-tick" data-on={i < step} />
            ))}
          </div>
          <span className="font-mono text-[10px] tracking-[0.22em] text-fg-quaternary">
            {String(step).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isLastStep && !canSubmit && submitHint && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-fg-quaternary sm:block">
              {submitHint}
            </span>
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit}
              className="flex items-center gap-2.5 border border-(--sc-a) bg-(--sc-a)/12 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-(--fg-primary) transition-all hover:bg-(--sc-a)/22 disabled:cursor-not-allowed disabled:border-border-standard disabled:bg-transparent disabled:text-(--fg-quaternary)"
            >
              {isSubmitting ? "Searching" : "Find my jobs"}
              {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-2.5 border border-(--sc-a) bg-(--sc-a)/12 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-(--fg-primary) transition-all hover:bg-(--sc-a)/22"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
