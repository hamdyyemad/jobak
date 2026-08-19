"use client";

import { currencyOptions } from "./data";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { inputClass, labelClass } from "./styles";

interface StepSalaryProps {
  salary: { min: number; max: number; currency: string };
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepSalary({ salary, onUpdate }: StepSalaryProps) {
  const invalidRange = salary.min > 0 && salary.max > 0 && salary.max < salary.min;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-5">
        <div>
          <label htmlFor="salary-min" className={labelClass}>
            Minimum
          </label>
          <input
            id="salary-min"
            type="number"
            value={salary.min || ""}
            onChange={(e) => onUpdate({ salary: { ...salary, min: parseInt(e.target.value) || 0 } })}
            placeholder="50,000"
            min="0"
            className={`${inputClass} font-mono text-[19px]`}
          />
        </div>

        <span aria-hidden="true" className="pb-3 font-mono text-[13px] text-fg-quaternary">
          —
        </span>

        <div>
          <label htmlFor="salary-max" className={labelClass}>
            Maximum
          </label>
          <input
            id="salary-max"
            type="number"
            value={salary.max || ""}
            onChange={(e) => onUpdate({ salary: { ...salary, max: parseInt(e.target.value) || 0 } })}
            placeholder="100,000"
            min="0"
            className={`${inputClass} font-mono text-[19px]`}
          />
        </div>
      </div>

      {invalidRange && (
        <p role="alert" className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--status-rose)">
          Maximum is below minimum — that range matches nothing
        </p>
      )}

      <div className="max-w-64">
        <label className={labelClass}>Currency</label>
        {/*
          Was a native <select>. Its option list is painted by the OS, so it came
          out as a white sheet on the dark canvas no matter what CSS was applied.
        */}
        <Select
          value={salary.currency}
          onChange={(currency) => onUpdate({ salary: { ...salary, currency } })}
          options={currencyOptions}
          searchPlaceholder="Search currencies…"
          ariaLabel="Currency"
        />
      </div>
    </div>
  );
}
