export type WorkPreference = "remote" | "on-site" | "hybrid";
export type JobType = "full-time" | "part-time" | "freelance" | "contract";
export type Seniority = "entry" | "mid" | "senior" | "lead";
export type AiProvider = "anthropic" | "openai" | "gemini" | "groq";

/** Result of asking a provider whether a key is live. */
export type KeyCheckStatus = "idle" | "checking" | "valid" | "invalid";

export interface OnboardingData {
    /** Multi-select: someone can be open to remote *and* hybrid. */
    workPreference: WorkPreference[];
    /**
     * `worldwide` is its own flag rather than an empty country, so "I have not
     * answered yet" stays distinct from "anywhere is fine". Remote-only searches
     * default it to true.
     */
    location: { country: string; worldwide: boolean };
    field: string;
    skills: string[];
    experience: number;
    jobType: JobType[];
    jobTitles: string[];
    /** Derived from `experience` unless the user overrides it. */
    seniority: Seniority | null;
    salary: { min: number; max: number; currency: string };
    /** Providers the user opted into, in pick order. */
    aiProviders: AiProvider[];
    /** Keyed by provider so a key survives deselecting and reselecting. */
    aiKeys: Partial<Record<AiProvider, string>>;
}
