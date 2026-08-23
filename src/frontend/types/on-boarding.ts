export type WorkPreference = "remote" | "on-site" | "hybrid";
export type JobType = "full-time" | "part-time" | "freelance" | "contract";
export type Seniority = "entry" | "mid" | "senior" | "lead";
export type AiProvider = "anthropic" | "openai" | "gemini" | "groq";

/**
 * Apify is not an LLM — it runs the actors that collect the job listings, so it
 * is required rather than chosen, and it is kept out of `AiProvider` so that
 * "at least one AI" stays a question about scoring models only.
 */
export type CredentialProvider = AiProvider | "apify";

/** Result of asking a provider whether a key is live. */
export type KeyCheckStatus = "idle" | "checking" | "valid" | "invalid";

export interface OnboardingData {
    /** Multi-select: someone can be open to remote *and* hybrid. */
    workPreference: WorkPreference[];
    /**
     * `worldwide` is its own flag rather than an empty list, so "I have not
     * answered yet" stays distinct from "anywhere is fine". Remote-only searches
     * default it to true. `countries` is a list because people genuinely search
     * more than one market at once.
     */
    location: { countries: string[]; worldwide: boolean };
    field: string;
    skills: string[];
    experience: number;
    jobType: JobType[];
    jobTitles: string[];
    /** Derived from `experience` unless the user overrides it. */
    seniority: Seniority | null;
    /** Scoring models the user opted into, in pick order. At least one required. */
    aiProviders: AiProvider[];
    /** Keyed by provider so a key survives deselecting and reselecting. */
    aiKeys: Partial<Record<AiProvider, string>>;
    /** Required: without it there is nothing to collect listings with. */
    apifyKey: string;
    /**
     * Apify actor keys the user switched on in the marketplace.
     *
     * Empty means "use the catalogue defaults", not "run nothing" — someone who
     * never opens the marketplace still collects from the recommended set.
     */
    apifyActors: string[];
}

/**
 * Attribution, collected on the step that runs while the first search does.
 *
 * Deliberately not part of `OnboardingData`: none of it is sent to the collector
 * or the matcher, and folding it into that payload would ship marketing answers
 * to n8n on every run. Empty string means unanswered — the step is skippable and
 * every field is optional.
 */
export interface MarketingAnswers {
    heardFrom: string;
    heardDetail: string;
    goal: string;
    searchStatus: string;
}
