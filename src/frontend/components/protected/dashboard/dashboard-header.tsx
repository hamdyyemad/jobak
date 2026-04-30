import Link from "next/link";
import { Search, RefreshCw, Settings, LogOut } from "lucide-react";

interface DashboardHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ search, onSearchChange, isRefreshing, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border-subtle sticky top-0 z-10 bg-(--bg-canvas)/80 backdrop-blur-sm">
      <div className="max-w-350 mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-(--bg-canvas) text-base">J</div>
          <span className="text-lg font-display tracking-tight hidden sm:block">Jobak</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--fg-tertiary)" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search jobs or companies..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/2 border border-border-standard text-(--fg-primary) placeholder:text-fg-quaternary focus:outline-none focus:border-accent transition-colors text-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-xl border border-border-standard flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong transition-all"
            title="Re-run job search"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/onboarding"
            className="w-9 h-9 rounded-xl border border-border-standard flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong transition-all"
            title="Update preferences"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="w-9 h-9 rounded-xl border border-border-standard flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
