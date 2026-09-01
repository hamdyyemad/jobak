import { RefreshCw } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

interface RefreshCTAProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * Note: nothing renders this today — the run-search action lives in
 * `greeting-banner`. Kept on the shared Button so it cannot drift out of the
 * system, but it is dead code and worth removing in a behavioural pass.
 */
export function RefreshCTA({ isRefreshing, onRefresh }: RefreshCTAProps) {
  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-card border border-border-subtle bg-(image:--surface-1) p-6 sm:flex-row">
      <div>
        <p className="font-medium text-fg-primary">Want fresher results?</p>
        <p className="mt-1 text-sm text-fg-tertiary">
          Re-run the search to pull the latest jobs from all sources.
        </p>
      </div>
      <Button variant="primary" onClick={onRefresh} disabled={isRefreshing} className="shrink-0">
        <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
        {isRefreshing ? "Searching…" : "Re-run search"}
      </Button>
    </div>
  );
}
