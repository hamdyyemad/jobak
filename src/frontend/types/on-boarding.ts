export type WorkPreference = "remote" | "on-site" | "hybrid";
export type JobType = "full-time" | "part-time" | "freelance" | "contract";
export type Seniority = "entry" | "mid" | "senior" | "lead";

export interface OnboardingData {
    workPreference: WorkPreference | null;
    location: { country: string; city: string };
    field: string;
    skills: string[];
    experience: number;
    jobType: JobType[];
    seniority: Seniority | null;
    salary: { min: number; max: number; currency: string };
    apiKey: string;
}
