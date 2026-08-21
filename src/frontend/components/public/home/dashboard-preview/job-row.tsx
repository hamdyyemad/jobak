import { Bookmark, BookmarkCheck, Wifi } from "lucide-react";
import { PreviewJob } from "./data";

export function JobRow({ job }: { job: PreviewJob }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-t border-border-subtle first:border-t-0">
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-border-standard flex items-center justify-center text-sm font-semibold shrink-0">
        {job.company[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h3 className="font-medium text-sm leading-snug truncate">{job.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
          <Pill>{job.type}</Pill>
          <span className="text-[11px] text-muted-foreground font-mono">{job.salary}</span>
          <span className="text-[11px] text-muted-foreground/60 ml-auto">{job.postedAt}</span>
        </div>
      </div>

      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        {job.bookmarked ? (
          <BookmarkCheck className="w-3.5 h-3.5 text-accent" />
        ) : (
          <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-standard text-muted-foreground capitalize">
      {children}
    </span>
  );
}

/** Mirrors the dashboard's threshold: 90+ reads as a strong match. */
function ScoreBadge({ score }: { score: number }) {
  const strong = score >= 90;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold shrink-0 ${
        strong
          ? "text-accent-text border-accent/30 bg-accent/10"
          : "text-muted-foreground border-border-standard bg-white/2"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}
    </div>
  );
}
