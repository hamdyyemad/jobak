"use client";

import { AlertTriangle, Check, ExternalLink, FileText, Globe, Repeat } from "lucide-react";
import type { ApifyCatalogue } from "@/backend/actions/apify";

interface StepApifyActorsProps {
  catalogue: ApifyCatalogue;
  /** Selected actor keys. Empty means "use the defaults". */
  selected: string[];
  onChange: (keys: string[]) => void;
  /** Without a token nothing here can run, so the whole list is shown disabled. */
  hasToken: boolean;
}

/**
 * The collection marketplace.
 *
 * Every actor here spends the user's own Apify credit, so the card leads with
 * what it costs and what it actually returns rather than with a name. Two facts
 * do most of the work:
 *
 *  - **Pricing model.** One of these is a $19.89/month rental, not a per-use
 *    charge. Switching it on without noticing that would be a genuinely bad
 *    surprise, so it is called out rather than buried.
 *  - **Whether it returns a description.** Four of the seven do not. Those rows
 *    reach the scorer as a title and a company name, and score accordingly —
 *    which looks like the AI being bad rather than the source being thin.
 */
export function StepApifyActors({ catalogue, selected, onChange, hasToken }: StepApifyActorsProps) {
  if (catalogue.error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border-standard bg-white/2">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-(--fg-secondary)">{catalogue.error}</p>
          <p className="text-xs text-(--fg-quaternary) mt-1">
            Your current selection is unchanged. Collection keeps running with whatever is already saved.
          </p>
        </div>
      </div>
    );
  }

  // An empty selection means "defaults", so that is what the toggles show.
  const active = new Set(selected.length > 0 ? selected : catalogue.defaults);

  function toggle(key: string) {
    const next = new Set(active);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-(--fg-tertiary) max-w-xl">
          Paid sources, run with your own Apify token when you press Search. Nothing here runs on a
          schedule — you are only ever charged for searches you asked for.
        </p>
        <button
          type="button"
          onClick={() => onChange([...catalogue.defaults])}
          className="text-xs text-(--fg-tertiary) hover:text-(--fg-primary) underline underline-offset-2 shrink-0"
        >
          Reset to recommended
        </button>
      </div>

      {!hasToken && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border-standard bg-white/2">
          <AlertTriangle className="w-4 h-4 text-(--fg-quaternary) shrink-0 mt-0.5" />
          <p className="text-xs text-(--fg-tertiary)">
            Add an Apify token below to use these. Without one, Jobak still collects from the free
            sources — Wuzzuf, Talent.com, the remote boards and company career pages.
          </p>
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {catalogue.actors.map((actor) => {
          const on = active.has(actor.key);
          const rental = actor.pricing.model === "monthly";

          return (
            <button
              key={actor.key}
              type="button"
              onClick={() => toggle(actor.key)}
              aria-pressed={on}
              className={`text-left p-4 rounded-xl border transition-all ${
                on
                  ? "border-accent/40 bg-accent/6"
                  : "border-border-standard bg-white/2 hover:border-border-strong"
              } ${hasToken ? "" : "opacity-60"}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    on ? "bg-accent border-accent" : "border-border-strong"
                  }`}
                >
                  {on && <Check className="w-3 h-3 text-(--bg-canvas)" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-(--fg-primary)">{actor.label}</span>
                    {actor.enabledByDefault && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-accent/30 text-accent-text bg-accent/8">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-(--fg-tertiary) mt-1 leading-relaxed">{actor.summary}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                    <Tag
                      icon={rental ? Repeat : FileText}
                      tone={rental ? "warn" : "muted"}
                      label={rental ? "Monthly subscription" : actor.pricing.model === "per-result" ? "Per result" : "Per run"}
                    />
                    <Tag
                      icon={Globe}
                      tone="muted"
                      label={actor.countries === null ? "Worldwide" : `${actor.countries.length} countries`}
                    />
                    {!actor.hasDescription && (
                      <Tag icon={AlertTriangle} tone="warn" label="No job description" />
                    )}
                  </div>

                  <p className="text-[11px] text-(--fg-quaternary) mt-2 leading-relaxed">
                    {actor.pricing.note}
                  </p>

                  <a
                    href={actor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-(--fg-quaternary) hover:text-accent mt-1.5"
                  >
                    {actor.slug}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tag({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  tone: "muted" | "warn";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] ${
        tone === "warn" ? "text-yellow-400/90" : "text-(--fg-quaternary)"
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}
