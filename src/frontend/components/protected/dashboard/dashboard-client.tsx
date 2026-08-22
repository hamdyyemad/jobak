"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Job, CvInsights } from "@/frontend/types/dashboard";
import { toggleBookmarkAction } from "@/backend/actions/jobs";
import { useJobFilters } from "@/frontend/hooks/protected/dashboard/use-job-filters";
import { Sidebar } from "./sidebar";
import { GreetingBanner } from "./greeting-banner";
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
  const [refreshError, setRefreshError] = useState<string | null>(null);
  /** What the queued search is doing, shown until the next list arrives. */
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const router = useRouter();

  /*
   * The server component owns the list and re-reads it on router.refresh().
   * Adjusting during render rather than in an effect is React's own guidance
   * for "reset state when a prop changes": an effect would paint the stale list
   * for a frame first, then cascade a second render to replace it.
   */
  const [syncedFrom, setSyncedFrom] = useState(initialJobs);
  if (syncedFrom !== initialJobs) {
    setSyncedFrom(initialJobs);
    setJobs(initialJobs);
  }

  const { search, setSearch, filterSource, setFilterSource, filteredJobs } = useJobFilters(jobs);

  /*
   * The filter row is built from the jobs on screen rather than a fixed list.
   * The collectors add sources over time, and a hardcoded row both offered
   * filters that could never match and hid the ones that could.
   */
  const sources = useMemo<(string | "all")[]>(
    () => ["all", ...Array.from(new Set(jobs.map((j) => j.source))).sort()],
    [jobs]
  );

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

  /*
   * Queues this user's search.
   *
   * For a user with an Apify token this is the one and only thing that spends
   * their credit — it is never scheduled. The endpoint records the request and
   * answers immediately, so this resolves in a round trip while the collecting
   * and scoring carry on behind it.
   */
  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    setRefreshNotice(null);
    try {
      const res = await fetch("/api/v1/jobs/refresh", { method: "POST" });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRefreshError(result.error ?? "Couldn't start your search. Try again in a moment.");
        return;
      }

      /*
       * The work is queued, not finished, so say so. Results land in the pool
       * over the next few minutes and the next refresh picks them up — the
       * server component owns the list, so this re-reads it without throwing
       * away scroll position the way a reload does.
       */
      setRefreshNotice(result.message ?? "Search running. New roles appear as they land.");
      router.refresh();
    } catch {
      setRefreshError("Couldn't reach the server. Check your connection.");
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
            {sources.map((source) => (
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

          {refreshError && (
            <p role="alert" className="mb-4 border-l-2 border-(--status-rose) py-2 pl-4 text-sm text-(--status-rose)">
              {refreshError}
            </p>
          )}

          {refreshNotice && !refreshError && (
            <p role="status" className="mb-4 border-l-2 border-(--status-amber) py-2 pl-4 text-sm text-fg-secondary">
              {refreshNotice}
            </p>
          )}

          {visibleJobs.length === 0 ? (
            <EmptyState
              hasAnyJobs={jobs.length > 0}
              isBookmarksTab={activeTab === "bookmarks"}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
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
