import { currencyOptions } from "./data";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { inputClass } from "./styles";

interface StepSalaryProps {
  salary: { min: number; max: number; currency: string };
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepSalary({
  salary,
  onUpdate,
}: StepSalaryProps) {
  const handleMinChange = (min: number) => {
    onUpdate({ salary: { ...salary, min } });
  };

  const handleMaxChange = (max: number) => {
    onUpdate({ salary: { ...salary, max } });
  };

  const handleCurrencyChange = (currency: string) => {
    onUpdate({ salary: { ...salary, currency } });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-fg-secondary">Minimum</label>
          <input
            type="number"
            value={salary.min || ""}
            onChange={(e) => handleMinChange(parseInt(e.target.value) || 0)}
            placeholder="50,000"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-fg-secondary">Maximum</label>
          <input
            type="number"
            value={salary.max || ""}
            onChange={(e) => handleMaxChange(parseInt(e.target.value) || 0)}
            placeholder="100,000"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">Currency</label>
        <select
          value={salary.currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className={inputClass + " appearance-none"}
        >
          {currencyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
