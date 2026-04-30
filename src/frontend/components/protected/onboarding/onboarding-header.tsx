import Link from "next/link";
import { X } from "lucide-react";

interface OnboardingHeaderProps {
  step: number;
  totalSteps: number;
  progress: number;
}

export function OnboardingHeader({ step, totalSteps, progress }: OnboardingHeaderProps) {
  return (
    <header className="border-b border-border-subtle backdrop-blur-sm sticky top-0 z-10 bg-(--bg-canvas)/80">
      <nav className="max-w-300 mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-(--bg-canvas) text-base">
            J
          </div>
          <span className="text-lg font-display tracking-tight">Jobak</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-(--fg-tertiary) font-mono">
            {step} / {totalSteps}
          </span>
          <Link
            href="/"
            className="w-8 h-8 rounded-lg border border-border-standard flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong transition-all"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </nav>
      {/* Progress bar */}
      <div className="h-px bg-bg-surface">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
