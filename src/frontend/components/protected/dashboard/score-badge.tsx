import { Sparkles } from "lucide-react";

interface ScoreBadgeProps {
  /** `null` while nothing has scored this job yet. */
  score: number | null;
}

/**
 * The match score, or an honest "not yet".
 *
 * A pending job used to render as `0`, which reads as "we looked at this and it
 * is a terrible match" rather than "the scorer has not reached this one". Since
 * the dashboard deliberately shows pool jobs before they are scored, that
 * distinction is most of what the badge is for.
 */
export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium text-(--fg-quaternary) border-border-standard bg-white/2"
        title="Waiting to be scored against your profile"
      >
        <Sparkles className="w-3 h-3" />
        Pending
      </div>
    );
  }

  const color =
    score >= 90
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : score >= 75
      ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
      : "text-[var(--fg-tertiary)] border-border-standard bg-white/2";

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold ${color}`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}
    </div>
  );
}
