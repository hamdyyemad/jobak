import { Bookmark, BookmarkCheck, Wifi } from "lucide-react";
import { Job } from "@/frontend/types/dashboard";
import { SOURCE_COLORS } from "./data";
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
      className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        selected
          ? "border-accent/40 bg-accent/5"
          : "border-border-standard bg-white/1 hover:bg-white/3 hover:border-border-strong"
      }`}
      style={{ animationDelay: `${index * 35}ms` }}
    >
      {selected && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-accent" />
      )}

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-border-standard flex items-center justify-center text-sm font-semibold shrink-0 group-hover:border-border-strong transition-colors">
          {job.company[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <h3 className="font-medium text-(--fg-primary) text-sm leading-snug truncate">{job.title}</h3>
              <p className="text-xs text-(--fg-tertiary) mt-0.5 truncate">
                {job.company}&nbsp;·&nbsp;{job.location}
                {job.remote && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-accent-text">
                    <Wifi className="w-3 h-3" /> Remote
                  </span>
                )}
              </p>
            </div>
            <ScoreBadge score={job.score} />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SOURCE_COLORS[job.source]}`}>
              {job.source}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-standard text-(--fg-tertiary) capitalize">
              {job.type}
            </span>
            {job.salary && (
              <span className="text-[11px] text-(--fg-tertiary) font-mono">{job.salary}</span>
            )}
            <span className="text-[11px] text-fg-quaternary ml-auto">{job.postedAt}</span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(job.id); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-(--fg-tertiary) hover:text-accent transition-colors shrink-0 mt-0.5"
          title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {job.bookmarked
            ? <BookmarkCheck className="w-3.5 h-3.5 text-accent" />
            : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
