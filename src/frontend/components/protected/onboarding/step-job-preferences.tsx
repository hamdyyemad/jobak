"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { jobTypeOptions, seniorityOptions, seniorityFromExperience } from "./data";
import { JobType, Seniority, OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { titlesForField } from "@/frontend/lib/configs/job-titles";
import { OptionRow } from "./option-row";
import { labelClass } from "./styles";

interface StepJobPreferencesProps {
  jobType: JobType[];
  jobTitles: string[];
  seniority: Seniority | null;
  experience: number;
  field: string;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepJobPreferences({
  jobType,
  jobTitles,
  seniority,
  experience,
  field,
  onUpdate,
}: StepJobPreferencesProps) {
  const [overriding, setOverriding] = useState(false);

  const effective = seniority ?? seniorityFromExperience(experience);
  const effectiveOption = seniorityOptions.find((o) => o.value === effective)!;

  /** Titles already chosen drop out of the list — picking one twice is a no-op. */
  const titleOptions = useMemo(
    () =>
      titlesForField(field)
        .filter((title) => !jobTitles.includes(title))
        .map((title) => ({ value: title, label: title })),
    [field, jobTitles]
  );

  const handleJobTypeToggle = (type: JobType) => {
    onUpdate({
      jobType: jobType.includes(type) ? jobType.filter((t) => t !== type) : [...jobType, type],
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <label className={labelClass}>Engagement</label>
        <div className="grid grid-cols-2 gap-x-8">
          {jobTypeOptions.map((opt, i) => (
            <OptionRow
              key={opt.value}
              index={i + 1}
              label={opt.label}
              selected={jobType.includes(opt.value)}
              onClick={() => handleJobTypeToggle(opt.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Job titles {field ? "· from your field" : "· pick a field for a shorter list"}
        </label>
        <Select
          value=""
          onChange={(title) => {
            if (title && !jobTitles.includes(title)) onUpdate({ jobTitles: [...jobTitles, title] });
          }}
          options={titleOptions}
          placeholder={titleOptions.length ? "Add a job title…" : "All titles added"}
          disabled={titleOptions.length === 0}
          searchPlaceholder="Search job titles…"
          ariaLabel="Job titles"
        />

        {jobTitles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {jobTitles.map((title) => (
              <span
                key={title}
                className="chip-in flex items-center gap-2 border border-border-standard px-3 py-1.5 text-[13px] text-fg-secondary"
              >
                {title}
                <button
                  type="button"
                  aria-label={`Remove ${title}`}
                  onClick={() => onUpdate({ jobTitles: jobTitles.filter((t) => t !== title) })}
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
        <label className={labelClass}>Seniority</label>

        {/*
          Read back, not asked again: the years came from step 3. It stays
          overridable because titles and years genuinely diverge — plenty of
          people lead at four years, or switch field at twelve.
        */}
        {!overriding ? (
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-3">
            <div className="flex items-baseline gap-4">
              <span key={effective} className="chip-in text-[15px] uppercase tracking-[0.13em] text-(--sc-a)">
                {effectiveOption.label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
                {experience > 0 ? `${experience} yr${experience === 1 ? "" : "s"}` : effectiveOption.years}
                {seniority ? " · set by you" : " · from step 03"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOverriding(true)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-tertiary transition-colors hover:text-(--fg-primary)"
            >
              <Pencil className="h-3 w-3" />
              Change
            </button>
          </div>
        ) : (
          <div>
            {seniorityOptions.map((opt, i) => (
              <OptionRow
                key={opt.value}
                index={i + 1}
                label={opt.label}
                trailing={opt.years}
                selected={effective === opt.value}
                onClick={() => {
                  onUpdate({ seniority: opt.value });
                  setOverriding(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
