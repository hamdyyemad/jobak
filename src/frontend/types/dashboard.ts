export type JobType = "full-time" | "part-time" | "freelance" | "contract";
export type Source = "LinkedIn" | "Indeed" | "RemoteOK" | "Wuzzuf" | "Glassdoor";

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    type: JobType;
    salary: string;
    score: number;
    source: Source;
    link: string;
    postedAt: string;
    bookmarked: boolean;
}
