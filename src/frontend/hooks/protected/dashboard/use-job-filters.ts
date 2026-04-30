import { useState, useMemo } from "react";
import { Job, Source } from "@/frontend/types/dashboard";

export function useJobFilters(jobs: Job[]) {
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState<Source | "all">("all");

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const matchesSearch =
                job.title.toLowerCase().includes(search.toLowerCase()) ||
                job.company.toLowerCase().includes(search.toLowerCase());
            const matchesSource = filterSource === "all" || job.source === filterSource;
            return matchesSearch && matchesSource;
        });
    }, [jobs, search, filterSource]);

    return {
        search,
        setSearch,
        filterSource,
        setFilterSource,
        filteredJobs,
    };
}
