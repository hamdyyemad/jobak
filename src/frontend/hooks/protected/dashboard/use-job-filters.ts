import { useState, useMemo } from "react";
import { Job, Source, Workplace } from "@/frontend/types/dashboard";

export type ScoredFilter = "all" | "scored" | "top";

/**
 * The dashboard's filters.
 *
 * Search and source were here already; workplace and score are new, and they
 * are the two people actually reach for. "Remote only" is the whole reason
 * someone in Cairo uses this product, and "scored only" separates what the AI
 * has judged from what is merely collected — a distinction the list makes
 * visible but previously offered no way to act on.
 */
export function useJobFilters(jobs: Job[]) {
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState<Source | "all">("all");
    const [filterWorkplace, setFilterWorkplace] = useState<Workplace | "all">("all");
    const [filterScored, setFilterScored] = useState<ScoredFilter>("all");

    const filteredJobs = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return jobs.filter((job) => {
            const matchesSearch =
                !needle ||
                job.title.toLowerCase().includes(needle) ||
                job.company.toLowerCase().includes(needle) ||
                job.location.toLowerCase().includes(needle) ||
                (job.tags ?? []).some((tag) => tag.toLowerCase().includes(needle));

            const matchesSource = filterSource === "all" || job.source === filterSource;
            const matchesWorkplace = filterWorkplace === "all" || job.workplace === filterWorkplace;

            /*
             * `score` is null for anything the matcher has not reached yet, so
             * "scored" and "top" both require a real number rather than
             * treating unscored as zero.
             */
            const matchesScored =
                filterScored === "all" ||
                (filterScored === "scored" && job.score !== null) ||
                (filterScored === "top" && job.score !== null && job.score >= 80);

            return matchesSearch && matchesSource && matchesWorkplace && matchesScored;
        });
    }, [jobs, search, filterSource, filterWorkplace, filterScored]);

    const reset = () => {
        setSearch("");
        setFilterSource("all");
        setFilterWorkplace("all");
        setFilterScored("all");
    };

    const isFiltered =
        Boolean(search.trim()) || filterSource !== "all" || filterWorkplace !== "all" || filterScored !== "all";

    return {
        search,
        setSearch,
        filterSource,
        setFilterSource,
        filterWorkplace,
        setFilterWorkplace,
        filterScored,
        setFilterScored,
        filteredJobs,
        reset,
        isFiltered,
    };
}
