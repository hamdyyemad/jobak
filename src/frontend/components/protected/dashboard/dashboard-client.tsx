"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Job, CvInsights } from "@/frontend/types/dashboard";
import { toggleBookmarkAction } from "@/backend/actions/jobs";
import { useJobFilters } from "@/frontend/hooks/protected/dashboard/use-job-filters";
import { SOURCES } from "@/frontend/components/protected/dashboard/data";
import { Sidebar } from "./sidebar";
import { GreetingBanner } from "./greeting-banner";
import { JobFilters } from "./job-filters";
import { JobList } from "./job-list";
import { JobDrawer } from "./job-drawer";
import { EmptyState } from "./empty-state";
import { ParticleBackground } from "@/frontend/components/shared/particle-background";

interface DashboardClientProps {
  initialJobs: Job[];
  userName?: string;
}

export function DashboardClient({ initialJobs, userName }: DashboardClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "bookmarks">("jobs");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { search, setSearch, filterSource, setFilterSource, filteredJobs } = useJobFilters(jobs);

  const bookmarkedCount = jobs.filter((j) => j.bookmarked).length;
  const topMatchesCount = jobs.filter((j) => j.score >= 80).length;
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((a, j) => a + j.score, 0) / jobs.length)
    : 0;
  const topSkills = useMemo(() => {
    const freq: Record<string, number> = {};
    jobs.forEach((j) => j.tags?.forEach((t) => { freq[t] = (freq[t] ?? 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 5);
  }, [jobs]);

  const insights: CvInsights = {
    topSkills,
    avgScore,
    topMatchesCount,
    totalJobs: jobs.length,
    bookmarkedCount,
  };

  const visibleJobs = activeTab === "bookmarks"
    ? filteredJobs.filter((j) => j.bookmarked)
    : filteredJobs;

  async function toggleBookmark(id: string) {
    const newValue = await toggleBookmarkAction(id);
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, bookmarked: newValue } : j)));
    // keep drawer in sync
    setSelectedJob((prev) => prev?.id === id ? { ...prev, bookmarked: newValue } : prev);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/jobs/refresh", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-(--bg-canvas) relative">
      <ParticleBackground />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setSelectedJob(null); }}
        bookmarkedCount={bookmarkedCount}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-15 shrink-0 flex items-center px-5 gap-3 border-b border-border-subtle bg-(--bg-canvas)/70 backdrop-blur-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--fg-tertiary)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs or companies…"
              className="w-full pl-8 pr-4 py-2 rounded-lg bg-white/3 border border-border-standard text-(--fg-primary) placeholder:text-fg-quaternary focus:outline-none focus:border-accent/60 transition-colors text-sm"
            />
          </div>

          {/* Source filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {SOURCES.map((source) => (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap capitalize ${
                  filterSource === source
                    ? "bg-accent text-(--bg-canvas) border-accent"
                    : "border-border-standard text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong bg-white/2"
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto px-5 py-5">
          <GreetingBanner
            userName={userName}
            insights={insights}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />

          {visibleJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <JobList
              jobs={visibleJobs}
              selectedId={selectedJob?.id ?? null}
              onSelect={setSelectedJob}
              onToggleBookmark={toggleBookmark}
            />
          )}
        </main>
      </div>

      {/* Right drawer */}
      <JobDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  );
}
