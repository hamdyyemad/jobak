import { workOptions } from "./data";
import { WorkPreference, OnboardingData } from "@/frontend/types/on-boarding";

interface StepWorkPreferenceProps {
  workPreference: WorkPreference | null;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepWorkPreference({ workPreference, onUpdate }: StepWorkPreferenceProps) {
  const handleSelect = (preference: WorkPreference) => {
    onUpdate({ workPreference: preference });
  };
  return (
    <div className="space-y-3">
      {workOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSelect(opt.value)}
          className={`w-full p-5 rounded-xl border transition-all text-left flex items-center gap-4 group ${
            workPreference === opt.value
              ? "border-accent bg-(--accent-bg)"
              : "border-border-standard bg-white/2 hover:bg-white/4 hover:border-border-strong"
          }`}
        >
          <span className="text-2xl">{opt.icon}</span>
          <div>
            <div className={`font-semibold text-base mb-0.5 ${workPreference === opt.value ? "text-accent-text" : ""}`}>
              {opt.label}
            </div>
            <div className="text-sm text-(--fg-tertiary)">{opt.description}</div>
          </div>
          {workPreference === opt.value && (
            <div className="ml-auto w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-(--bg-canvas)" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
