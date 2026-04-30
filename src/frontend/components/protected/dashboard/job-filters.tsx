import { SlidersHorizontal } from "lucide-react";
import { Source } from "@/frontend/types/dashboard";
import { SOURCES } from "./data";

interface JobFiltersProps {
  activeFilter: Source | "all";
  onFilterChange: (source: Source | "all") => void;
}

export function JobFilters({ activeFilter, onFilterChange }: JobFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal className="w-4 h-4 text-(--fg-tertiary) shrink-0" />
      {SOURCES.map((source) => (
        <button
          key={source}
          onClick={() => onFilterChange(source)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
            activeFilter === source
              ? "bg-accent text-(--bg-canvas) border-accent"
              : "border-border-standard text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong bg-white/2"
          }`}
        >
          {source}
        </button>
      ))}
    </div>
  );
}
