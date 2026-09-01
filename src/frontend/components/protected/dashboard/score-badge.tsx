interface ScoreBadgeProps {
  /** `null` while nothing has scored this job yet. */
  score: number | null;
}

/**
 * The colour a score is worth.
 *
 * These are tokens now. The badge previously reached straight into Tailwind's
 * default palette for `green-400` and `yellow-400`, which put the two loudest
 * colours on the dashboard outside the design system entirely — and made "high
 * score" the same green as the primary button, so a page full of good matches
 * drowned out the one action on it.
 */
function scoreColor(score: number): string {
  if (score >= 80) return "var(--score-high)";
  if (score >= 60) return "var(--score-mid)";
  return "var(--score-low)";
}

/**
 * The match score, or an honest "not yet".
 *
 * A pending job used to render as `0`, which reads as "we looked at this and it
 * is a terrible match" rather than "the scorer has not reached this one". Since
 * the dashboard deliberately shows pool jobs before they are scored, that
 * distinction is most of what the badge is for.
 *
 * The value is now encoded twice — as digits and as the length of the meter —
 * so a strong match registers while you are still scanning down the list.
 */
export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <div
        className="inline-flex shrink-0 items-center gap-2 rounded-chip border border-border-standard bg-white/2.5 py-0.5 pl-2 pr-2.5 font-mono text-xs text-fg-quaternary"
        title="Waiting to be scored against your profile"
      >
        <span className="h-1 w-[22px] rounded-full bg-(--score-pending)" aria-hidden="true" />
        <span aria-label="Not yet scored">—</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex shrink-0 items-center gap-2 rounded-chip border border-border-standard bg-white/2.5 py-0.5 pl-2 pr-2.5 font-mono text-xs font-medium tabular-nums text-fg-primary"
      title={`Matched ${score} out of 100 against your profile`}
    >
      <span className="h-1 w-[22px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor(score) }}
        />
      </span>
      {score}
    </div>
  );
}
