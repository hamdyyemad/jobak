import { Bookmark, RefreshCw, Search, Telescope } from "lucide-react";

interface EmptyStateProps {
    /** Whether the user has any matches at all, as opposed to none after filtering. */
    hasAnyJobs: boolean;
    isBookmarksTab: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
}

/**
 * Three genuinely different situations used to share one "No matches found".
 *
 * The one that mattered was the cold start: collection runs on a schedule, so a
 * user who just finished onboarding can have zero matches simply because nothing
 * has been collected for their titles yet. Telling them to "adjust filters" is
 * advice they cannot act on.
 */
export function EmptyState({ hasAnyJobs, isBookmarksTab, isRefreshing, onRefresh }: EmptyStateProps) {
    if (isBookmarksTab) {
        return (
            <div className="py-24 text-center text-(--fg-tertiary)">
                <Bookmark className="mx-auto mb-4 h-8 w-8 opacity-40" />
                <p className="font-display text-lg">Nothing saved yet</p>
                <p className="mt-2 text-sm">Bookmark a job and it will wait for you here.</p>
            </div>
        );
    }

    // Jobs exist but the current search or source filter hides all of them.
    if (hasAnyJobs) {
        return (
            <div className="py-24 text-center text-(--fg-tertiary)">
                <Search className="mx-auto mb-4 h-8 w-8 opacity-40" />
                <p className="font-display text-lg">No matches for that filter</p>
                <p className="mt-2 text-sm">Clear the search, or pick a different source.</p>
            </div>
        );
    }

    return (
        <div className="py-24 text-center text-(--fg-tertiary)">
            <Telescope className="mx-auto mb-4 h-8 w-8 opacity-40" />
            <p className="font-display text-lg text-(--fg-secondary)">Still gathering listings</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed">
                We collect on a schedule rather than on demand, so the first matches for your job
                titles can take a few hours to appear. Nothing is wrong — and you don&apos;t need to
                stay on this page.
            </p>
            <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="mt-6 inline-flex items-center gap-2 border border-border-strong px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-tertiary transition-colors hover:border-accent hover:text-(--fg-primary) disabled:cursor-not-allowed disabled:opacity-40"
            >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Checking…" : "Check now"}
            </button>
        </div>
    );
}
