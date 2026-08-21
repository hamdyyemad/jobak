"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { Flag } from "@/frontend/components/shared/flag";
import { countries, countryName } from "@/frontend/lib/configs/countries";
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
  /** Already-picked countries drop out of the list — choosing one twice is a no-op. */
  const available = useMemo(
    () => countryOptions.filter((o) => !location.countries.includes(o.value)),
    [location.countries]
  );

  const setWorldwide = (worldwide: boolean) => {
    onUpdate({ location: { ...location, worldwide } });
  };

  const addCountry = (code: string) => {
    if (!code || location.countries.includes(code)) return;
    onUpdate({ location: { countries: [...location.countries, code], worldwide: false } });
  };

  const removeCountry = (code: string) => {
    onUpdate({ location: { ...location, countries: location.countries.filter((c) => c !== code) } });
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
          label="Specific countries"
          hint="Search one market or several"
          selected={!location.worldwide}
          onClick={() => setWorldwide(false)}
        />
      </div>

      {/*
        The picker fades back rather than disappearing when the search is
        worldwide — the scene beside it is already carrying the answer, and a
        control that vanishes makes the layout jump on every toggle.
      */}
      <div
        className={`transition-opacity duration-500 ${location.worldwide ? "opacity-35" : "opacity-100"}`}
      >
        <label className={labelClass}>
          Countries{" "}
          {!location.worldwide && location.countries.length > 0 && (
            <span className="text-(--sc-a)">· {location.countries.length} selected</span>
          )}
        </label>

        <Select
          value=""
          onChange={addCountry}
          options={available}
          disabled={location.worldwide || available.length === 0}
          placeholder={
            available.length === 0
              ? "All countries added"
              : `Add a country · ${available.length} available`
          }
          searchPlaceholder="Type a country name…"
          ariaLabel="Add a country"
        />

        {location.countries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {location.countries.map((code) => (
              <span
                key={code}
                className="chip-in flex items-center gap-2 border border-border-standard px-3 py-1.5 text-[13px] text-fg-secondary"
              >
                <Flag code={code} />
                {countryName(code)}
                <button
                  type="button"
                  aria-label={`Remove ${countryName(code)}`}
                  onClick={() => removeCountry(code)}
                  className="leading-none text-fg-quaternary transition-colors hover:text-(--fg-primary)"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
