interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const color =
    score >= 90
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : score >= 75
      ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
      : "text-[var(--fg-tertiary)] border-border-standard bg-white/2";

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold ${color}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}
    </div>
  );
}
