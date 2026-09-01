"use client";

import { Zap } from "lucide-react";
import { CvInsights } from "@/frontend/types/dashboard";
import { Button } from "@/frontend/components/ui/button";
import { Stat } from "@/frontend/components/ui/stat";

interface GreetingBannerProps {
  userName?: string;
  insights: CvInsights;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The top of the dashboard: who you are, what is waiting, and the one action.
 *
 * This was a `rounded-2xl` panel with two blurred accent glows behind it and
 * four small stat pills inside — 16px values under 11px labels. The numbers the
 * page exists to report were the least prominent thing on it, and the glows
 * were the most dated surface in the product.
 *
 * Now the greeting is plain type on the canvas and the numbers are the object:
 * a row of stat blocks with the value set large and tabular, and a meter on the
 * two values that are proportions. Nothing is boxed that does not need to be.
 */
export function GreetingBanner({ userName, insights, isRefreshing, onRefresh }: GreetingBannerProps) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const strong = insights.topMatchesCount;

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
            {getGreeting()}
          </p>
          <h1 className="mt-2.5 font-display text-[26px] font-semibold tracking-[-0.03em] text-fg-primary">
            {firstName}, {strong} strong match{strong !== 1 ? "es" : ""} waiting
          </h1>
          {insights.topSkills.length > 0 && (
            <p className="mt-1.5 text-sm text-fg-tertiary">
              Most common in your matches:{" "}
              {insights.topSkills.slice(0, 3).map((skill, i) => (
                <span key={skill}>
                  <span className="text-fg-secondary">{skill}</span>
                  {i < Math.min(insights.topSkills.length, 3) - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
        </div>

        <Button variant="primary" size="lg" onClick={onRefresh} disabled={isRefreshing}>
          <Zap className={isRefreshing ? "animate-pulse" : ""} />
          {isRefreshing ? "Searching…" : "Run search"}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Stat label="Jobs found" value={insights.totalJobs} />
        <Stat
          label="Avg match"
          value={`${insights.avgScore}%`}
          meter={insights.avgScore}
          meterColor={
            insights.avgScore >= 80
              ? "var(--score-high)"
              : insights.avgScore >= 60
              ? "var(--score-mid)"
              : "var(--score-low)"
          }
        />
        <Stat
          label="Top matches"
          value={insights.topMatchesCount}
          caption="Scored 80 or above"
          meter={insights.totalJobs ? (insights.topMatchesCount / insights.totalJobs) * 100 : 0}
          meterColor="var(--score-high)"
        />
        <Stat label="Bookmarked" value={insights.bookmarkedCount} />
      </div>
    </div>
  );
}
