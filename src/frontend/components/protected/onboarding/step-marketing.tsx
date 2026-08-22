"use client";

import { useState } from "react";
import {
  heardFromOptions,
  goalOptions,
  searchStatusOptions,
  HEARD_DETAIL_MAX,
} from "@/frontend/lib/configs/marketing";
import type { MarketingAnswers } from "@/frontend/types/on-boarding";
import { OptionRow } from "./option-row";

interface StepMarketingProps {
  answers: MarketingAnswers;
  onUpdate: (updates: Partial<MarketingAnswers>) => void;
}

type Group = "heardFrom" | "goal" | "searchStatus";

const groups: { key: Group; legend: string; options: { value: string; label: string }[] }[] = [
  { key: "heardFrom", legend: "How did you find us?", options: heardFromOptions },
  { key: "goal", legend: "What are you hoping for?", options: goalOptions },
  { key: "searchStatus", legend: "Where are you in your search?", options: searchStatusOptions },
];

/**
 * The last step, shown while the first collection is already running.
 *
 * Three short questions, one at a time: asking all of them at once turns the
 * reassurance at the top into a form, and the point of this step is that the
 * waiting has somewhere to go. Nothing here is required, and nothing here
 * affects matching — a user who closes the tab has still finished onboarding.
 */
export function StepMarketing({ answers, onUpdate }: StepMarketingProps) {
  // Which question is on screen. Advancing on select keeps this to three taps.
  const [index, setIndex] = useState(0);
  const group = groups[Math.min(index, groups.length - 1)];
  const done = index >= groups.length;

  const choose = (key: Group, value: string) => {
    onUpdate({ [key]: value } as Partial<MarketingAnswers>);
    setIndex((current) => current + 1);
  };

  return (
    <div>
      {/*
        The status line is the reason this step exists, so it leads — the user
        should know the search is underway before being asked anything.
      */}
      <div className="mb-8 border-l-2 border-(--status-amber) py-2 pl-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
          Search running
        </p>
        <p className="mt-1 text-[15px] text-fg-secondary">
          We&rsquo;re collecting roles now — it usually takes a few minutes. Your dashboard fills
          in as results arrive, so there&rsquo;s nothing to wait on here.
        </p>
      </div>

      {done ? (
        <p className="text-[15px] text-fg-secondary">
          Thanks — that&rsquo;s everything. Head to your dashboard whenever you&rsquo;re ready.
        </p>
      ) : (
        <div key={group.key}>
          <p
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
            id={`marketing-${group.key}`}
          >
            {group.legend}
          </p>

          <div role="group" aria-labelledby={`marketing-${group.key}`}>
            {group.options.map((opt, i) => (
              <OptionRow
                key={opt.value}
                index={i + 1}
                label={opt.label}
                selected={answers[group.key] === opt.value}
                onClick={() => choose(group.key, opt.value)}
              />
            ))}
          </div>

          {/*
            Only for "somewhere else" — a free-text box under every channel
            invites nobody to fill it in and makes the step look longer than it
            is.
          */}
          {group.key === "heardFrom" && answers.heardFrom === "other" && (
            <input
              type="text"
              value={answers.heardDetail}
              maxLength={HEARD_DETAIL_MAX}
              onChange={(e) => onUpdate({ heardDetail: e.target.value })}
              placeholder="Where, roughly?"
              className="mt-4 w-full border-b border-(--border-subtle) bg-transparent pb-2 text-[15px] text-fg-secondary outline-none placeholder:text-fg-quaternary focus:border-(--fg-primary)"
            />
          )}

          <button
            type="button"
            onClick={() => setIndex((current) => current + 1)}
            className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary underline-offset-4 hover:underline"
          >
            Skip this one
          </button>
        </div>
      )}

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
        {done ? "Optional · already saved" : `Question ${index + 1} of ${groups.length} · optional`}
      </p>
    </div>
  );
}
