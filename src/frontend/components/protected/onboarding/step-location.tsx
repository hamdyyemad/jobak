"use client";

import { useMemo } from "react";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { Select } from "@/frontend/components/shared/select";
import { Flag } from "@/frontend/components/shared/flag";
import { countries } from "@/frontend/lib/configs/countries";
import { OptionRow } from "./option-row";
import { labelClass } from "./styles";

interface StepLocationProps {
  location: OnboardingData["location"];
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepLocation({ location, onUpdate }: StepLocationProps) {
  /*
   * 246 rows, each with an <img>. Built once rather than per render, and the
   * flags themselves are lazy — only the ones scrolled into the open list load.
   */
  const options = useMemo(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: country.name,
        keywords: country.code,
        icon: <Flag code={country.code} />,
      })),
    []
  );

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
          options={options}
          disabled={location.worldwide}
          placeholder={`Search ${countries.length} countries…`}
          searchPlaceholder="Type a country name…"
          ariaLabel="Country"
        />
      </div>
    </div>
  );
}
