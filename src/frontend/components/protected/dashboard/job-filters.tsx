import { SlidersHorizontal } from "lucide-react";
import { Source } from "@/frontend/types/dashboard";
import { FilterChip } from "@/frontend/components/ui/chip";

interface JobFiltersProps {
  activeFilter: Source | "all";
  /** Built from the jobs on screen, so it never lists a source with no results. */
  sources: (Source | "all")[];
  onFilterChange: (source: Source | "all") => void;
}

/**
 * Note: nothing renders this today — `dashboard-client` has its own inline
 * `FilterGroup`. It is kept on the shared `FilterChip` so the two cannot drift,
 * but the duplication is real and worth collapsing in a behavioural pass.
 */
export function JobFilters({ sources, activeFilter, onFilterChange }: JobFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="size-4 shrink-0 text-fg-tertiary" />
      {sources.map((source) => (
        <FilterChip
          key={source}
          selected={activeFilter === source}
          onClick={() => onFilterChange(source)}
        >
          {source}
        </FilterChip>
      ))}
    </div>
  );
}
