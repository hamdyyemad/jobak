import { Job } from "@/frontend/types/dashboard";
import { JobCard } from "./job-card";

interface JobListProps {
  jobs: Job[];
  selectedId: string | null;
  onSelect: (job: Job) => void;
  onToggleBookmark: (id: string) => void;
}

export function JobList({ jobs, selectedId, onSelect, onToggleBookmark }: JobListProps) {
  return (
    <div className="space-y-2">
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          index={index}
          selected={job.id === selectedId}
          onSelect={onSelect}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
}
