"use client";

import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { Flag } from "@/frontend/components/shared/flag";
import { countries } from "@/frontend/lib/configs/countries";
import { OptionRow } from "./option-row";
import { labelClass } from "./styles";

/*
 * Module scope, not useMemo: the list is derived from a static import and never
 * changes, so it is built once per page load. A useMemo here was rebuilding all
 * 246 descriptors every time the step remounted — and the step is keyed on the
 * step number, so it remounts on every move back to step 2.
 *
 * Only the rows the dropdown actually mounts pay for their <Flag>; Select
 * windows the list, and the flags themselves load lazily on top of that.
 */
const countryOptions = countries.map((country) => ({
  value: country.code,
  label: country.name,
  keywords: country.code,
  icon: <Flag code={country.code} />,
}));

interface StepLocationProps {
  location: OnboardingData["location"];
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepLocation({ location, onUpdate }: StepLocationProps) {
  const setWorldwide = (worldwide: boolean) => {
    onUpdate({ location: { ...location, worldwide } });
  };

  return (
    <div className="space-y-8">
      <div>
        <OptionRow
          index={1}
          label="Worldwide"
          hint="Remote roles, no country filter"
          selected={location.worldwide}
          onClick={() => setWorldwide(true)}
        />
        <OptionRow
          index={2}
          label="Specific country"
          hint="Narrow to one market"
          selected={!location.worldwide}
          onClick={() => setWorldwide(false)}
        />
      </div>

      {/*
        The country picker fades back rather than disappearing when the search is
        worldwide — the scene beside it is already carrying the answer, and a
        control that vanishes makes the layout jump on every toggle.
      */}
      <div
        className={`transition-opacity duration-500 ${location.worldwide ? "opacity-35" : "opacity-100"}`}
      >
        <label className={labelClass}>Country</label>
        <Select
          value={location.country}
          onChange={(country) => onUpdate({ location: { country, worldwide: false } })}
          options={countryOptions}
          disabled={location.worldwide}
          placeholder={`Search ${countries.length} countries…`}
          searchPlaceholder="Type a country name…"
          ariaLabel="Country"
        />
      </div>
    </div>
  );
}
