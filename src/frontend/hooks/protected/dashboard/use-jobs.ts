import { useState } from "react";
import { Job } from "@/frontend/types/dashboard";
import { MOCK_JOBS } from "@/frontend/components/protected/dashboard/data";

export function useJobs() {
    const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);

    const toggleBookmark = (id: string) => {
        setJobs((prev) =>
            prev.map((job) =>
                job.id === id ? { ...job, bookmarked: !job.bookmarked } : job
            )
        );
    };

    const bookmarkedCount = jobs.filter((job) => job.bookmarked).length;
    const topMatchesCount = jobs.filter((job) => job.score >= 90).length;

    return {
        jobs,
        toggleBookmark,
        bookmarkedCount,
        topMatchesCount,
    };
}
