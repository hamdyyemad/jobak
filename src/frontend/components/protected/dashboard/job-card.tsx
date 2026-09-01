import { Bookmark, BookmarkCheck, Wifi } from "lucide-react";
import { Job } from "@/frontend/types/dashboard";
import { Chip } from "@/frontend/components/ui/chip";
import { sourceHue } from "./data";
import { ScoreBadge } from "./score-badge";

interface JobCardProps {
  job: Job;
  index: number;
  selected: boolean;
  onSelect: (job: Job) => void;
  onToggleBookmark: (id: string) => void;
}

export function JobCard({ job, index, selected, onSelect, onToggleBookmark }: JobCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(job)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(job)}
      className={`group relative cursor-pointer rounded-card border p-4 outline-none transition-[border-color,transform,background] duration-150 focus-visible:ring-2 focus-visible:ring-accent/60 ${
        selected
          ? "border-accent/40 bg-accent/6"
          : "border-border-subtle bg-(image:--surface-1) hover:-translate-y-px hover:border-border-strong"
      }`}
      style={{ animationDelay: `${index * 35}ms` }}
    >
      {selected && (
        <div className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-accent" />
      )}

      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border-standard bg-white/5 text-sm font-semibold transition-colors group-hover:border-border-strong">
          {job.company[0]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium leading-snug text-fg-primary">
                {job.title}
              </h3>
              <p className="mt-0.5 truncate text-xs text-fg-tertiary">
                {job.company}&nbsp;·&nbsp;{job.location}
                {job.remote && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-accent-text">
                    <Wifi className="size-3" /> Remote
                  </span>
                )}
              </p>
            </div>
            <ScoreBadge score={job.score} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip dot={sourceHue(job.source)}>{job.source}</Chip>
            <Chip className="capitalize">{job.type}</Chip>
            {job.salary && (
              <span className="font-mono text-[11px] text-fg-tertiary tabular-nums">
                {job.salary}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-fg-quaternary">
              {job.postedAt}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(job.id);
          }}
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control text-fg-tertiary transition-colors hover:bg-white/5 hover:text-accent"
          title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {job.bookmarked ? (
            <BookmarkCheck className="size-3.5 text-accent" />
          ) : (
            <Bookmark className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
