import { ArrowLeft, ArrowRight } from "lucide-react";

interface OnboardingNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function OnboardingNavigation({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: OnboardingNavigationProps) {
  return (
    <div className="flex items-center justify-between mt-12 pt-8 border-t border-border-subtle">
      <button
        onClick={onBack}
        disabled={isFirstStep}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
          isFirstStep
            ? "opacity-25 cursor-not-allowed text-(--fg-tertiary)"
            : "bg-white/2 border border-border-standard hover:bg-white/4 hover:border-border-strong"
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {isLastStep ? (
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-medium text-sm hover:bg-accent-bright transition-all shadow-[0_0_24px_rgba(82,195,107,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Searching..." : "Find my jobs"}
          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-medium text-sm hover:bg-accent-bright transition-all shadow-[0_0_24px_rgba(82,195,107,0.15)]"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
