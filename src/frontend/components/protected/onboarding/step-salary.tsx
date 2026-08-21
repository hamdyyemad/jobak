"use client";

import { currencyOptions } from "./data";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { NumberField } from "@/frontend/components/shared/number-field";
import { labelClass } from "./styles";

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
          <NumberField
            id="salary-min"
            value={salary.min}
            onChange={(min) => onUpdate({ salary: { ...salary, min } })}
            placeholder="50,000"
            min={0}
            step={1000}
            ariaLabel="minimum salary"
            className="font-mono text-[19px]"
          />
        </div>

        <span aria-hidden="true" className="pb-3 font-mono text-[13px] text-fg-quaternary">
          —
        </span>

        <div>
          <label htmlFor="salary-max" className={labelClass}>
            Maximum
          </label>
          <NumberField
            id="salary-max"
            value={salary.max}
            onChange={(max) => onUpdate({ salary: { ...salary, max } })}
            placeholder="100,000"
            min={0}
            step={1000}
            ariaLabel="maximum salary"
            className="font-mono text-[19px]"
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
