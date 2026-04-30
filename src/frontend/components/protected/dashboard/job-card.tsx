import { ArrowUpRight, Bookmark, BookmarkCheck } from "lucide-react";
import { Job } from "@/frontend/types/dashboard";
import { SOURCE_COLORS } from "./data";
import { ScoreBadge } from "./score-badge";

interface JobCardProps {
  job: Job;
  index: number;
  onToggleBookmark: (id: string) => void;
}

export function JobCard({ job, index, onToggleBookmark }: JobCardProps) {
  return (
    <div
      className="group p-5 rounded-xl border border-border-standard bg-white/1 hover:bg-white/3 hover:border-border-strong transition-all duration-200"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Company initial */}
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-border-standard flex items-center justify-center text-sm font-semibold shrink-0 group-hover:border-border-strong transition-colors">
          {job.company[0]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div>
              <h3 className="font-semibold text-(--fg-primary) leading-snug">{job.title}</h3>
              <p className="text-sm text-fg-secondary mt-0.5">
                {job.company} · {job.location}
              </p>
            </div>
            <ScoreBadge score={job.score} />
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${SOURCE_COLORS[job.source]}`}>
              {job.source}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border-standard text-(--fg-tertiary) capitalize">
              {job.type}
            </span>
            <span className="text-xs text-(--fg-tertiary) font-mono">{job.salary}</span>
            <span className="text-xs text-fg-quaternary ml-auto">{job.postedAt}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleBookmark(job.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--fg-tertiary) hover:text-accent transition-colors"
            title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {job.bookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-accent" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) transition-colors"
            title="Apply"
          >
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
