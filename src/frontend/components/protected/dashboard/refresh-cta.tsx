import { RefreshCw } from "lucide-react";

interface RefreshCTAProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function RefreshCTA({ isRefreshing, onRefresh }: RefreshCTAProps) {
  return (
    <div className="mt-12 p-6 rounded-xl border border-border-standard bg-white/1 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-(--fg-primary)">Want fresher results?</p>
        <p className="text-sm text-(--fg-tertiary) mt-0.5">
          Re-run the search to pull the latest jobs from all sources.
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-(--bg-canvas) font-medium text-sm hover:bg-accent-bright transition-all shrink-0 shadow-[0_0_20px_rgba(82,195,107,0.12)]"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Searching..." : "Re-run search"}
      </button>
    </div>
  );
}
