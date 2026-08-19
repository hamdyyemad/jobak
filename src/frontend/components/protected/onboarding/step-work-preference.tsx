"use client";

import { workOptions } from "./data";
import { WorkPreference, OnboardingData } from "@/frontend/types/on-boarding";
import { OptionRow } from "./option-row";

interface StepWorkPreferenceProps {
  workPreference: WorkPreference[];
  location: OnboardingData["location"];
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepWorkPreference({
  workPreference,
  location,
  onUpdate,
}: StepWorkPreferenceProps) {
  const handleToggle = (preference: WorkPreference) => {
    const next = workPreference.includes(preference)
      ? workPreference.filter((p) => p !== preference)
      : [...workPreference, preference];

    /*
     * Someone who will only work remotely has no country to answer with, so the
     * next step is pre-answered as worldwide rather than asking a question with
     * no meaningful answer. Adding any on-site arrangement puts the question
     * back, because now a location genuinely matters.
     */
    const remoteOnly = next.length === 1 && next[0] === "remote";

    onUpdate({
      workPreference: next,
      location: remoteOnly
        ? { country: "", worldwide: true }
        : { ...location, worldwide: false },
    });
  };

  return (
    <div>
      <div>
        {workOptions.map((opt, i) => (
          <OptionRow
            key={opt.value}
            index={i + 1}
            label={opt.label}
            hint={opt.description}
            selected={workPreference.includes(opt.value)}
            onClick={() => handleToggle(opt.value)}
          />
        ))}
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
        Multiple allowed · remote alone searches worldwide
      </p>
    </div>
  );
}
