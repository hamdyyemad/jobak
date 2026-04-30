import { jobTypeOptions, seniorityOptions } from "./data";
import { JobType, Seniority, OnboardingData } from "@/frontend/types/on-boarding";

interface StepJobPreferencesProps {
  jobType: JobType[];
  seniority: Seniority | null;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepJobPreferences({
  jobType,
  seniority,
  onUpdate,
}: StepJobPreferencesProps) {
  const handleJobTypeToggle = (type: JobType) => {
    const newJobTypes = jobType.includes(type)
      ? jobType.filter((t) => t !== type)
      : [...jobType, type];
    onUpdate({ jobType: newJobTypes });
  };

  const handleSenioritySelect = (selectedSeniority: Seniority) => {
    onUpdate({ seniority: selectedSeniority });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 text-fg-secondary">
          Job Type <span className="text-fg-quaternary font-normal">(select all that apply)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {jobTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleJobTypeToggle(opt.value)}
              className={`p-4 rounded-xl border transition-all text-sm font-medium ${
                jobType.includes(opt.value)
                  ? "border-accent bg-(--accent-bg) text-accent-text"
                  : "border-border-standard bg-white/2 hover:bg-white/4 hover:border-border-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3 text-fg-secondary">Seniority Level</label>
        <div className="space-y-2">
          {seniorityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSenioritySelect(opt.value)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                seniority === opt.value
                  ? "border-accent bg-(--accent-bg)"
                  : "border-border-standard bg-white/2 hover:bg-white/4 hover:border-border-strong"
              }`}
            >
              <span className={`font-medium ${seniority === opt.value ? "text-accent-text" : ""}`}>
                {opt.label}
              </span>
              <span className="text-sm text-fg-quaternary font-mono">{opt.years}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
