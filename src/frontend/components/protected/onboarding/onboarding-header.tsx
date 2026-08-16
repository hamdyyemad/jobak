import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

interface OnboardingHeaderProps {
  step: number;
  totalSteps: number;
  progress: number;
}

export function OnboardingHeader({ step, totalSteps, progress }: OnboardingHeaderProps) {
  return (
    <header className="border-b border-border-subtle backdrop-blur-sm sticky top-0 z-10 bg-(--bg-canvas)/80">
      <nav className="max-w-300 mx-auto px-6 py-4 flex items-center justify-between">
        {/*
          Not a link. Onboarding has to be completed on first run, so the header
          carries no way out — that is also why there is no close button.
        */}
        <JobakLogo size="sm" showText href="" />

        <span className="text-sm text-(--fg-tertiary) font-mono" aria-live="polite">
          {step} / {totalSteps}
        </span>
      </nav>

      {/* Progress bar — scaled rather than width-animated, so it never lays out */}
      <div
        className="h-px bg-bg-surface"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full w-full origin-left bg-accent transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </header>
  );
}
