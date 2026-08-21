/** One listing, in the shape the n8n workflow and `jobs` table already expect. */
export interface ScrapedJob {
    title: string;
    company: string;
    location: string;
    job_type: "remote" | "onsite" | "hybrid";
    description: string;
    apply_url: string;
    salary_text: string | null;
    /** ISO 8601, or null. Never a relative phrase — see `toTimestamp`. */
    posted_at_source: string | null;
    source_key: string;
    external_id: string;
}

export interface Country {
    /** ISO 3166-1 alpha-2. */
    code: string;
    name: string;
}

export interface ScrapeParams {
    /** What to search for — a job title, or the field as words. */
    query: string;
    countries: Country[];
    worldwide: boolean;
    /** "remote" | "on-site" | "hybrid" */
    workPreference: string[];
    /** Max listings to return from each source. */
    limit: number;
    /**
     * Company slugs to pull from applicant tracking systems, e.g.
     * { greenhouse: ["stripe"], ashby: ["ramp"] }.
     */
    ats?: Record<string, string[]>;
}

/**
 * How a source relates to geography — the aggregator uses this to decide
 * whether a source is worth calling for a given search at all.
 */
export type SourceGeo =
    /** Only ever returns remote roles; a country filter is advisory at best. */
    | "remote-only"
    /** Tied to specific countries, listed in `countries`. */
    | "country"
    /** Company job boards; location varies per posting. */
    | "company";

export interface SourceAdapter {
    key: string;
    label: string;
    kind: "api" | "rss" | "html" | "ats";
    geo: SourceGeo;
    /** For `geo: "country"` sources — which markets they actually cover. */
    countries?: string[];
    /**
     * Free-form note surfaced by /api/sources, so the caller knows what it is
     * getting without reading the adapter.
     */
    note?: string;
    fetchJobs(params: ScrapeParams, signal: AbortSignal): Promise<ScrapedJob[]>;
}

export interface SourceResult {
    source: string;
    ok: boolean;
    count: number;
    ms: number;
    error?: string;
}
