import { Job } from "@/frontend/types/dashboard";
import { JobCard } from "./job-card";

interface JobListProps {
  jobs: Job[];
  onToggleBookmark: (id: string) => void;
}

export function JobList({ jobs, onToggleBookmark }: JobListProps) {
  return (
    <div className="space-y-3">
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          index={index}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
}
