interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
}

export function StepHeader({ step, totalSteps, title, description }: StepHeaderProps) {
  return (
    <div className="mb-10">
      <span className="inline-flex items-center gap-3 text-xs font-mono text-fg-quaternary mb-5 uppercase tracking-widest">
        <span className="w-6 h-px bg-border-strong" />
        Step {step} of {totalSteps}
      </span>
      <h1 className="text-[42px] leading-[1.05] font-display tracking-tight mb-3">
        {title}
      </h1>
      <p className="text-[15px] text-fg-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
