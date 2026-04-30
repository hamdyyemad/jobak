interface DashboardStatsProps {
  totalJobs: number;
  topMatches: number;
  bookmarked: number;
  sources: number;
}

export function DashboardStats({ totalJobs, topMatches, bookmarked, sources }: DashboardStatsProps) {
  const stats = [
    { label: "Jobs found", value: totalJobs.toString() },
    { label: "Top matches", value: topMatches.toString() },
    { label: "Bookmarked", value: bookmarked.toString() },
    { label: "Sources", value: sources.toString() },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="p-4 rounded-xl border border-border-standard bg-white/1">
          <div className="text-2xl font-display mb-1">{stat.value}</div>
          <div className="text-xs text-(--fg-tertiary)">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
