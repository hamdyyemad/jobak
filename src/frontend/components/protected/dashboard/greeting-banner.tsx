"use client";

import { Zap, TrendingUp, Briefcase, Bookmark } from "lucide-react";
import { CvInsights } from "@/frontend/types/dashboard";

interface GreetingBannerProps {
  userName?: string;
  insights: CvInsights;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/3 border border-border-standard">
      <Icon className="w-4 h-4 text-accent shrink-0" />
      <div>
        <div className="text-base font-semibold font-mono text-(--fg-primary) leading-none">{value}</div>
        <div className="text-[11px] text-(--fg-tertiary) mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function GreetingBanner({ userName, insights, isRefreshing, onRefresh }: GreetingBannerProps) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const scoreColor =
    insights.avgScore >= 80
      ? "text-accent"
      : insights.avgScore >= 65
      ? "text-status-amber"
      : "text-(--fg-tertiary)";

  return (
    <div className="relative rounded-2xl border border-border-standard bg-(--bg-panel) overflow-hidden mb-6">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-accent/3 blur-3xl" />
      </div>

      <div className="relative px-6 py-5">
        {/* Top row: greeting + button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-(--fg-tertiary) font-medium uppercase tracking-widest mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-xl font-semibold text-(--fg-primary)">
              {firstName},&nbsp;
              <span className={scoreColor}>
                {insights.topMatchesCount} strong match{insights.topMatchesCount !== 1 ? "es" : ""}
              </span>
              &nbsp;waiting for you
            </h1>
            {insights.topSkills.length > 0 && (
              <p className="text-sm text-(--fg-tertiary) mt-1">
                Top skills detected:&nbsp;
                {insights.topSkills.slice(0, 3).map((s, i) => (
                  <span key={s}>
                    <span className="text-accent-text">{s}</span>
                    {i < Math.min(insights.topSkills.length, 3) - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright disabled:opacity-60 transition-all shrink-0 shadow-[0_0_24px_oklch(0.82_0.20_145_/_0.18)]"
          >
            <Zap className={`w-4 h-4 ${isRefreshing ? "animate-pulse" : ""}`} />
            {isRefreshing ? "Searching…" : "Run Search"}
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill icon={Briefcase} value={insights.totalJobs} label="Jobs found" />
          <StatPill icon={TrendingUp} value={`${insights.avgScore}%`} label="Avg match score" />
          <StatPill icon={Zap} value={insights.topMatchesCount} label="Top matches (≥80)" />
          <StatPill icon={Bookmark} value={insights.bookmarkedCount} label="Bookmarked" />
        </div>
      </div>
    </div>
  );
}
