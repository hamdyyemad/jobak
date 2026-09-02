/**
 * The vocabulary every source, strategy and filter in this service shares.
 *
 * Nothing here knows how any particular board works. A source is described by
 * what it *is* (`SourceDescriptor`), obtains raw records through a
 * `CollectionStrategy`, and maps them into `ScrapedJob`. That separation is the
 * whole point: adding a board should mean writing a mapper, not another
 * bespoke fetch-and-regex routine.
 */

/** One listing, in the shape the n8n workflow and the `jobs` table expect. */
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

    /**
     * Which market this listing is open to, as decided by `classifyScope`.
     *
     * Carried on the row so a downstream consumer can tell "remote, hires
     * anywhere" from "remote, but only inside Germany" without re-parsing the
     * location text. `null` for on-site and hybrid roles, where the location
     * *is* the answer.
     */
    remote_scope?: RemoteScopeKind | null;

    /**
     * The language the source published in. Arabic boards post Arabic titles,
     * and the matcher downstream needs to know that rather than guess.
     */
    language?: "en" | "ar";

    /**
     * Filled in by the enrichment pass, never by a source. Absent on a fresh
     * scrape; see `src/enrichment/company.ts`.
     */
    company_links?: CompanyLinks;
}

/** Where a company actually accepts applications, beyond the aggregator's page. */
export interface CompanyLinks {
    /** The company's own domain, e.g. `https://instabug.com`. */
    website: string | null;
    /** `https://www.linkedin.com/company/<slug>`, usually lifted from the footer. */
    linkedin: string | null;
    /** A careers/jobs page on the company's own site, if it has one. */
    careers: string | null;
}

export interface Country {
    /** ISO 3166-1 alpha-2. */
    code: string;
    name: string;
}

/**
 * Coarse groupings a remote posting names instead of a country.
 *
 * Postings say "EMEA", "LATAM" and "Europe" far more often than they list
 * countries, so eligibility has to be answerable at this granularity or most
 * remote rows fall through to "unknown".
 */
export type RegionTag =
    | "mena"
    | "africa"
    | "europe"
    | "north-america"
    | "latam"
    | "apac"
    | "oceania";

/**
 * How wide a remote role's hiring window is.
 *
 * - `worldwide` — hires from anywhere. The only kind a `worldwide: true` search
 *   should surface.
 * - `restricted` — remote, but only inside named countries or regions.
 *   "Remote Deutschland" and "Americas, Europe, Israel" are both this.
 * - `unknown` — the location text carries no usable signal ("Remote", "Remote
 *   job"). Kept, because dropping it would empty several feeds.
 */
export type RemoteScopeKind = "worldwide" | "restricted" | "unknown";

export type RemoteScope =
    | { kind: "worldwide" }
    | { kind: "restricted"; countries: Set<string>; regions: Set<RegionTag> }
    | { kind: "unknown" };

/**
 * Everything a source needs to answer one search, plus the abort signal that
 * bounds it. Replaces the old `(params, signal)` pair so a strategy can be
 * handed a single value.
 */
export interface SearchContext {
    /** What to search for — a job title, or the field as words. */
    query: string;
    countries: Country[];
    /** "hires from anywhere" — not "no geography filter". See `filters/geography.ts`. */
    worldwide: boolean;
    /** "remote" | "on-site" | "hybrid" */
    workPreference: string[];
    /** Max listings to return from each source. */
    limit: number;
    /** Company slugs per ATS, e.g. `{ greenhouse: ["instabug"] }`. */
    ats: Record<string, string[]>;
    /**
     * Drop anything posted more than this many days ago. 1 means today.
     * Undated listings are kept either way — see `filters/freshness.ts`.
     */
    maxAgeDays?: number;
    /**
     * Drop remote roles whose location text carries no geographic signal.
     *
     * Off by default — a bare "Remote" is the most common value in these feeds,
     * and dropping it costs far more real matches than it saves bad ones. On
     * when a caller wants only roles that state they hire from anywhere.
     */
    strictRemote?: boolean;
    signal: AbortSignal;
}

/**
 * How a source relates to geography — the registry uses this to decide whether
 * a source is worth calling for a given search at all.
 */
export type SourceGeo =
    /** Only ever returns remote roles; a country filter is advisory at best. */
    | "remote-only"
    /** Tied to specific countries, listed in `countries`. */
    | "country"
    /** Company job boards; location varies per posting. */
    | "company";

export type SourceKind = "api" | "rss" | "html" | "detail" | "ats" | "apify";

/**
 * Which client sends this source's requests.
 *
 * `fetch` is this runtime, and is right for every source whose origin does not
 * inspect the TLS handshake. `stealth` routes through `services/browser`, whose
 * ClientHello is Chrome's — the only thing that gets past Cloudflare's
 * fingerprint gate, and the reason Bayt is collectable at all.
 */
export type Transport = "fetch" | "stealth";

export interface SourceDescriptor {
    key: string;
    label: string;
    kind: SourceKind;
    geo: SourceGeo;
    /** For `geo: "country"` sources — which markets they actually cover. */
    countries?: string[];
    /** What the board publishes in. Drives `ScrapedJob.language`. */
    language: "en" | "ar";
    /**
     * On by default when the caller names no sources. Off is for sources that
     * need configuration (ATS slugs) or that only pay off in narrow cases.
     */
    enabledByDefault: boolean;
    /** Surfaced by /api/sources so a caller knows what it is getting. */
    note?: string;
    /** Defaults to `fetch`. A source asking for `stealth` skips itself if it is not deployed. */
    transport?: Transport;
}

/**
 * How raw records are obtained. The Strategy half of the design: a source
 * declares *what* it is and *how to map a record*, and delegates *how to get
 * records* to one of these.
 */
export interface CollectionStrategy<TRaw> {
    readonly kind: SourceKind;
    collect(ctx: SearchContext): Promise<TRaw[]>;
    /**
     * Non-fatal problems from the last `collect`, surfaced on the source's
     * result. For anything that partially succeeded — three of five ATS slugs
     * answered, say — this is the difference between a visible warning and a
     * silent shortfall that reads as "nothing was hiring".
     */
    notes?(): string[];
}

/** Per-source outcome, reported whether the source succeeded, failed or was skipped. */
export interface SourceResult {
    source: string;
    ok: boolean;
    count: number;
    ms: number;
    /** Rows the source returned before this service's filters ran. */
    fetched?: number;
    error?: string;
}

export interface SourceRun {
    result: SourceResult;
    jobs: ScrapedJob[];
}

/**
 * A source with its raw-record type erased.
 *
 * The registry and the pipeline have no business knowing what shape a
 * particular board's records take — they only ever describe a source and run
 * it. Erasing to `JobSource<never>` does not work (`TRaw` is used in both
 * argument and return positions, so it is invariant), and erasing to
 * `JobSource<any>` throws away the checking inside each source. This interface
 * is the view those two callers actually need, and every `JobSource` satisfies
 * it structurally.
 */
export interface RunnableSource {
    readonly descriptor: SourceDescriptor;
    run(ctx: SearchContext): Promise<SourceRun>;
}

/** A search before the pipeline gives each source its own abort signal. */
export type SearchRequest = Omit<SearchContext, "signal">;
