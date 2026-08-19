interface StepHeaderProps {
  step: number;
  totalSteps: number;
  kicker: string;
  title: string;
  description: string;
}

export function StepHeader({ step, totalSteps, kicker, title, description }: StepHeaderProps) {
  return (
    <div className="relative mb-8">
      {/*
        The step number, oversized and hollow behind the heading — neoconda.com
        runs its wordmark at viewport scale and lets the subject sit in front of
        it. Decorative only; the announced count is in the kicker below.
      */}
      <span aria-hidden="true" className="step-numeral font-display">
        {String(step).padStart(2, "0")}
      </span>

      <span className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.34em] text-fg-quaternary">
        <span className="h-px w-7 bg-(--sc-a)" />
        {kicker}
        <span className="text-(--fg-quaternary)/60">
          {String(step).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
        </span>
      </span>

      <h1 className="font-display text-[clamp(34px,4.4vw,58px)] leading-[0.98] tracking-[-0.03em] mb-4">
        {title}
      </h1>

      <p className="max-w-100 text-[14px] leading-relaxed text-fg-tertiary">{description}</p>
    </div>
  );
}
