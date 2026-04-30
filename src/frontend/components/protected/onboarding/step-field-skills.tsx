import { X } from "lucide-react";
import { useSkillsManager } from "@/frontend/hooks/protected/onboarding";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { inputClass } from "./styles";

interface StepFieldSkillsProps {
  field: string;
  skills: string[];
  experience: number;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepFieldSkills({
  field,
  skills,
  experience,
  onUpdate,
}: StepFieldSkillsProps) {
  const handleSkillsChange = (newSkills: string[]) => {
    onUpdate({ skills: newSkills });
  };

  const { skillInput, setSkillInput, addSkill, removeSkill } = useSkillsManager(skills, handleSkillsChange);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleFieldChange = (newField: string) => {
    onUpdate({ field: newField });
  };

  const handleExperienceChange = (newExperience: number) => {
    onUpdate({ experience: newExperience });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">Job Field</label>
        <input
          type="text"
          value={field}
          onChange={(e) => handleFieldChange(e.target.value)}
          placeholder="e.g., Software Engineering, Marketing, Design"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">
          Skills & Technologies
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., React, Python, SEO"
            className={inputClass}
          />
          <button
            onClick={addSkill}
            className="px-5 py-3 rounded-xl bg-accent text-(--bg-canvas) font-medium hover:bg-accent-bright transition-all text-sm shrink-0"
          >
            Add
          </button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 rounded-full bg-(--accent-bg) border border-accent text-sm text-accent-text flex items-center gap-1.5"
              >
                {skill}
                <button onClick={() => removeSkill(skill)} className="hover:text-(--fg-primary) transition-colors leading-none">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">Years of Experience</label>
        <input
          type="number"
          value={experience || ""}
          onChange={(e) => handleExperienceChange(parseInt(e.target.value) || 0)}
          placeholder="e.g., 3"
          min="0"
          className={inputClass}
        />
      </div>
    </div>
  );
}
