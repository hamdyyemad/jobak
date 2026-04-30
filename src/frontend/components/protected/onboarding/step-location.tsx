import { WorkPreference, OnboardingData } from "@/frontend/types/on-boarding";
import { inputClass } from "./styles";

interface StepLocationProps {
  location: { country: string; city: string };
  workPreference: WorkPreference | null;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepLocation({
  location,
  workPreference,
  onUpdate,
}: StepLocationProps) {
  const handleCountryChange = (country: string) => {
    onUpdate({ location: { ...location, country } });
  };

  const handleCityChange = (city: string) => {
    onUpdate({ location: { ...location, city } });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">Country</label>
        <input
          type="text"
          value={location.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          placeholder="e.g., Egypt"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">
          City{" "}
          {workPreference === "remote" && (
            <span className="text-fg-quaternary font-normal">(optional for remote)</span>
          )}
        </label>
        <input
          type="text"
          value={location.city}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="e.g., Cairo"
          className={inputClass}
        />
      </div>
    </div>
  );
}
