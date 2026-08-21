"use client";

import { X } from "lucide-react";
import { useSkillsManager } from "@/frontend/hooks/protected/onboarding";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { NumberField } from "@/frontend/components/shared/number-field";
import { jobFields } from "@/frontend/lib/configs/job-titles";
import { seniorityFromExperience, seniorityOptions } from "./data";
import { inputClass, labelClass } from "./styles";

interface StepFieldSkillsProps {
  field: string;
  skills: string[];
  experience: number;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const fieldOptions = jobFields.map((f) => ({
  value: f.value,
  label: f.label,
  keywords: f.titles.join(" "),
}));

export function StepFieldSkills({
  field,
  skills,
  experience,
  onUpdate,
}: StepFieldSkillsProps) {
  const { skillInput, setSkillInput, addSkill, removeSkill } = useSkillsManager(skills, (newSkills) =>
    onUpdate({ skills: newSkills })
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const derived = seniorityOptions.find((o) => o.value === seniorityFromExperience(experience));

  return (
    <div className="space-y-8">
      <div>
        <label className={labelClass}>Field</label>
        <Select
          value={field}
          onChange={(newField) =>
            /*
             * Titles are scoped to the field, so changing the field invalidates
             * any titles already picked rather than leaving a Data Analyst
             * filed under Marketing.
             */
            onUpdate({ field: newField, jobTitles: [] })
          }
          options={fieldOptions}
          placeholder="Choose your field…"
          searchPlaceholder="Search fields…"
          ariaLabel="Job field"
        />
      </div>

      <div>
        <label htmlFor="skill-input" className={labelClass}>
          Skills
        </label>
        <div className="flex items-end gap-3">
          <input
            id="skill-input"
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="React, Python, SEO…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addSkill}
            className="shrink-0 border border-border-strong px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-tertiary transition-colors hover:border-(--sc-a) hover:text-(--fg-primary)"
          >
            Add
          </button>
        </div>

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="chip-in flex items-center gap-2 border border-border-standard px-3 py-1.5 text-[13px] text-fg-secondary"
              >
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => removeSkill(skill)}
                  className="leading-none text-fg-quaternary transition-colors hover:text-(--fg-primary)"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="experience-input" className={labelClass}>
          Years of experience
        </label>
        <NumberField
          id="experience-input"
          value={experience}
          onChange={(years) => onUpdate({ experience: years })}
          placeholder="3"
          min={0}
          max={60}
          ariaLabel="years of experience"
        />
        {/*
          The only place experience is asked. Step 4 used to ask again as a
          seniority band, which was the same question twice — it now reads the
          level back from this number instead.
        */}
        {experience > 0 && derived && (
          <p
            key={derived.value}
            className="chip-in mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
          >
            Reads as <span className="text-(--sc-a)">{derived.label}</span> · adjustable next step
          </p>
        )}
      </div>
    </div>
  );
}
