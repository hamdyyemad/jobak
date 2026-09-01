import { Bookmark, RefreshCw, Search, Telescope } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

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
function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-card border border-border-subtle bg-(image:--surface-1) px-6 py-20 text-center">
            {children}
        </div>
    );
}

export function EmptyState({ hasAnyJobs, isBookmarksTab, isRefreshing, onRefresh }: EmptyStateProps) {
    if (isBookmarksTab) {
        return (
            <Shell>
                <Bookmark className="mx-auto mb-4 size-7 text-fg-quaternary" />
                <p className="font-display text-lg font-semibold tracking-[-0.02em] text-fg-secondary">
                    Nothing saved yet
                </p>
                <p className="mt-2 text-sm text-fg-tertiary">
                    Bookmark a job and it will wait for you here.
                </p>
            </Shell>
        );
    }

    // Jobs exist but the current search or source filter hides all of them.
    if (hasAnyJobs) {
        return (
            <Shell>
                <Search className="mx-auto mb-4 size-7 text-fg-quaternary" />
                <p className="font-display text-lg font-semibold tracking-[-0.02em] text-fg-secondary">
                    No matches for that filter
                </p>
                <p className="mt-2 text-sm text-fg-tertiary">
                    Clear the search, or pick a different source.
                </p>
            </Shell>
        );
    }

    return (
        <Shell>
            <Telescope className="mx-auto mb-4 size-7 text-fg-quaternary" />
            <p className="font-display text-lg font-semibold tracking-[-0.02em] text-fg-secondary">
                Still gathering listings
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-tertiary">
                We collect on a schedule rather than on demand, so the first matches for your job
                titles can take a few hours to appear. Nothing is wrong — and you don&apos;t need to
                stay on this page.
            </p>
            <Button
                variant="secondary"
                className="mt-6"
                onClick={onRefresh}
                disabled={isRefreshing}
            >
                <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Checking…" : "Check now"}
            </Button>
        </Shell>
    );
}
