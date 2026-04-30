"use client";

import { useJobs, useJobFilters, useJobRefresh } from "@/frontend/hooks/protected/dashboard";
import {
  DashboardHeader,
  DashboardStats,
  JobFilters,
  JobList,
  EmptyState,
  RefreshCTA,
} from "@/frontend/components/protected/dashboard";
import { SOURCES } from "@/frontend/components/protected/dashboard/data";

export default function DashboardPage() {
  const { jobs, toggleBookmark, bookmarkedCount, topMatchesCount } = useJobs();
  const { search, setSearch, filterSource, setFilterSource, filteredJobs } = useJobFilters(jobs);
  const { isRefreshing, handleRefresh } = useJobRefresh();

  return (
    <div className="min-h-screen bg-(--bg-canvas) flex flex-col">
      <DashboardHeader
        search={search}
        onSearchChange={setSearch}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <main className="flex-1 max-w-350 mx-auto w-full px-6 py-8">
        <DashboardStats
          totalJobs={jobs.length}
          topMatches={topMatchesCount}
          bookmarked={bookmarkedCount}
          sources={SOURCES.length - 1}
        />

        <div className="mt-8 mb-6">
          <JobFilters
            activeFilter={filterSource}
            onFilterChange={setFilterSource}
          />
        </div>

        {filteredJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <JobList jobs={filteredJobs} onToggleBookmark={toggleBookmark} />
        )}

        <RefreshCTA isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      </main>
    </div>
  );
}
