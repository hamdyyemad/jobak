import { SlidersHorizontal } from "lucide-react";
import { previewJobs, previewFilters } from "./data";
import { JobRow } from "./job-row";

export function PreviewPanel() {
  return (
    <div className="rounded-2xl border border-border-standard bg-white/2 overflow-hidden">
      <PanelChrome />
      <FilterBar />
      <div>
        {previewJobs.map((job) => (
          <JobRow key={`${job.company}-${job.title}`} job={job} />
        ))}
      </div>
      <PanelFooter />
    </div>
  );
}

function PanelChrome() {
  return (
    <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-4">
      <div className="flex gap-2 shrink-0">
        <span className="w-3 h-3 rounded-full bg-foreground/15" />
        <span className="w-3 h-3 rounded-full bg-foreground/15" />
        <span className="w-3 h-3 rounded-full bg-foreground/15" />
      </div>
      <span className="text-xs font-mono text-muted-foreground truncate">
        jobak / dashboard
      </span>
    </div>
  );
}

function FilterBar() {
  return (
    <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2 overflow-x-auto">
      <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
      {previewFilters.map((source, index) => (
        <span
          key={source}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap capitalize ${
            index === 0
              ? "bg-accent text-background border-accent"
              : "border-border-standard text-muted-foreground bg-white/2"
          }`}
        >
          {source}
        </span>
      ))}
    </div>
  );
}

function PanelFooter() {
  return (
    <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-accent" />
      <span className="text-xs font-mono text-muted-foreground">
        Sorted by relevance score
      </span>
    </div>
  );
}
