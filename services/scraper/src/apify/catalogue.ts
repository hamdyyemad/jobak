import type { ScrapedJob, SearchContext } from "../core/types.js";
import { clean, inferJobType, pick, toTimestamp } from "../lib/normalize.js";

/**
 * The Apify marketplace.
 *
 * Seven actors, described once, here. This is the catalogue the settings page
 * renders, the defaults onboarding applies, and the input/output mapping the
 * collector uses — one definition rather than three that drift.
 *
 * Every entry states what it costs and what it actually returns, because those
 * two facts decide whether a user should switch it on and neither is visible
 * from the actor's name. In particular: **four of the seven return no job
 * description at all.** They are card-level scrapers — title, company,
 * location, link — and the AI scorer has very little to work with on those
 * rows. That is not a bug in the mapping; it is what the actor publishes.
 *
 * Actor input schemas were read from `api.apify.com/v2/acts/{id}/builds/default`
 * rather than guessed. When an actor changes its schema this file is what needs
 * updating, and `scripts/apify-probe.ts` is what tells you.
 */

export type ApifyPricingModel = "per-result" | "per-run" | "monthly";

export interface ApifyActorSpec {
    /** Stable key: stored in user preferences and written as `source_key`. */
    key: string;
    /** Apify's opaque actor id — stable across renames, unlike the slug. */
    actorId: string;
    /** `owner/name`, for the marketplace link. */
    slug: string;
    label: string;
    /** One line for the marketplace card. */
    summary: string;
    /** ISO codes it covers, or `null` for worldwide. */
    countries: string[] | null;
    language: "en" | "ar";
    pricing: {
        model: ApifyPricingModel;
        /** Plain-language cost, shown on the card. */
        note: string;
    };
    /**
     * Whether the dataset carries a real job description.
     *
     * Surfaced in the marketplace because it is the single biggest quality
     * difference between these actors: a row with no description gives the
     * scorer only a title to judge, and scores accordingly.
     */
    hasDescription: boolean;
    /** On for a new user. Kept to a non-overlapping, no-subscription set. */
    enabledByDefault: boolean;
    /** Actor input for this search. */
    buildInput(ctx: SearchContext): Record<string, unknown>;
    /** One dataset item → one listing, or null to drop it. */
    mapRow(row: Record<string, unknown>, ctx: SearchContext): ScrapedJob | null;
}

/** `location`/`country` fields want a country the actor recognises. */
function firstCountry(ctx: SearchContext, allowed: string[], fallback: string): string {
    const hit = ctx.countries.find((country) => allowed.includes(country.code));
    return hit?.code ?? fallback;
}

/* ────────────────────────────────────────────────────────────────────────── */

const wuzzufApify: ApifyActorSpec = {
    key: "apify_wuzzuf",
    actorId: "NkBkvhoCEb5FldY0w",
    slug: "blackfalcondata/wuzzuf-scraper",
    label: "Wuzzuf (Apify)",
    summary: "Egypt and Gulf listings from Wuzzuf, with salary, workplace type and career level.",
    countries: ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB"],
    language: "en",
    pricing: { model: "per-run", note: "Charged per actor start, by memory. Roughly $1 for a typical run." },
    hasDescription: false,
    enabledByDefault: true,

    buildInput: (ctx) => ({
        query: ctx.query,
        country: firstCountry(ctx, ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB"], "EG"),
        // The actor's own remote filter: "2" is its Remote workplace id.
        workplaceArrangement: ctx.workPreference.length === 1 && ctx.workPreference[0] === "remote" ? "2" : "",
        maxResults: ctx.limit,
    }),

    mapRow: (row) => ({
        title: clean(row.title),
        company: clean(row.company) || "Confidential",
        location: clean(row.location),
        job_type: inferJobType(row.workplaceArrangement, row.location),
        // Card-level actor: no description is published, so none is invented.
        description: "",
        apply_url: clean(pick(row, ["canonicalUrl", "url"], "")),
        salary_text: clean(row.salaryText) || null,
        posted_at_source: toTimestamp(pick(row, ["postedAt", "postedDate"], null)),
        source_key: "apify_wuzzuf",
        external_id: clean(pick(row, ["canonicalUrl", "url"], "")),
    }),
};

const baytApify: ApifyActorSpec = {
    key: "apify_bayt",
    actorId: "RSrQB3yaKHv3m7ndV",
    slug: "blackfalcondata/bayt-scraper",
    label: "Bayt (Apify)",
    summary: "MENA-wide listings from Bayt — the source the free scraper cannot reach.",
    countries: ["AE", "SA", "EG", "KW", "QA", "BH", "JO", "LB", "OM", "IQ", "MA"],
    language: "en",
    pricing: { model: "per-run", note: "Charged per actor start, by memory." },
    hasDescription: false,
    enabledByDefault: true,

    buildInput: (ctx) => ({
        query: ctx.query,
        country: firstCountry(
            ctx,
            ["AE", "SA", "EG", "KW", "QA", "BH", "JO", "LB", "OM", "IQ", "MA"],
            "INTERNATIONAL"
        ),
        sortBy: "date",
        maxResults: ctx.limit,
    }),

    mapRow: (row) => ({
        title: clean(row.title),
        company: clean(row.company) || "Confidential",
        location: clean(row.location),
        job_type: row.isRemote === true ? "remote" : inferJobType(row.location, row.employmentType),
        description: "",
        apply_url: clean(row.url),
        salary_text: clean(row.salaryText) || null,
        posted_at_source: toTimestamp(pick(row, ["postedDate", "postedAt"], null)),
        source_key: "apify_bayt",
        external_id: clean(row.url),
    }),
};

const baytMemo: ApifyActorSpec = {
    key: "apify_bayt_memo",
    actorId: "zcFsadJ1IiDgNwUj1",
    slug: "memo23/bayt-scraper",
    label: "Bayt — detailed (Apify)",
    summary: "A second Bayt scraper with 49 filters and richer rows. Overlaps heavily with Bayt (Apify).",
    countries: ["AE", "SA", "EG", "KW", "QA", "BH", "JO", "LB", "OM", "IQ", "MA", "TN", "DZ", "LY", "YE", "SY", "PS"],
    language: "en",
    pricing: { model: "per-result", note: "$0.0009 per result — about $0.09 for 100 jobs." },
    hasDescription: true,
    // Off: it collects the same listings as `apify_bayt`, and paying two actors
    // to scrape one site is the most obvious way to waste a user's credit.
    enabledByDefault: false,

    buildInput: (ctx) => ({
        searchJobKeyword: ctx.query,
        searchCountryRegion: BAYT_MEMO_REGIONS[ctx.countries[0]?.code ?? ""] ?? "international",
        // The actor spells these out; "24h" was rejected silently, which is
        // exactly the kind of failure scripts/apify-probe.ts exists to catch.
        searchPostedWithin: ctx.maxAgeDays && ctx.maxAgeDays <= 1 ? "past_24_hours" : "past_7_days",
        searchSortBy: "date",
        searchRemoteOnly: ctx.workPreference.length === 1 && ctx.workPreference[0] === "remote",
        searchLanguage: "en",
        maxItems: ctx.limit,
    }),

    mapRow: (row) => ({
        title: clean(pick(row, ["jobTitle", "title"], "")),
        company: clean(pick(row, ["companyName", "company"], "")) || "Confidential",
        location: clean(pick(row, ["jobLocation", "location"], "")),
        job_type: inferJobType(pick(row, ["workType", "jobLocation", "location"], "")),
        description: String(pick(row, ["jobDescription", "description"], "")),
        apply_url: clean(pick(row, ["jobUrl", "url"], "")),
        salary_text: clean(pick(row, ["salary", "monthlySalary"], "")) || null,
        posted_at_source: toTimestamp(pick(row, ["postedDate", "datePosted", "postedAt"], null)),
        source_key: "apify_bayt_memo",
        external_id: clean(pick(row, ["jobId", "jobUrl", "url"], "")),
    }),
};

/** memo23's own region slugs — not ISO codes, and not derivable from them. */
const BAYT_MEMO_REGIONS: Record<string, string> = {
    AE: "uae", SA: "saudi-arabia", QA: "qatar", KW: "kuwait", OM: "oman",
    BH: "bahrain", EG: "egypt", JO: "jordan", LB: "lebanon", IQ: "iraq",
    MA: "morocco", TN: "tunisia", DZ: "algeria", LY: "libya", YE: "yemen",
    SY: "syria", PS: "palestine",
};

const wuzzufShahid: ApifyActorSpec = {
    key: "apify_wuzzuf_alt",
    actorId: "fLUtuncwYGKY61XSf",
    slug: "shahidirfan/Wuzzuf-Jobs-Scraper",
    label: "Wuzzuf — alternative (Apify)",
    summary: "A second Wuzzuf scraper. Useful as a fallback if the primary one breaks.",
    countries: ["EG"],
    language: "en",
    pricing: { model: "per-run", note: "Charged per actor start, by memory." },
    hasDescription: false,
    // Off: same site as `apify_wuzzuf`. Kept because a scraper against a site
    // that changes as often as Wuzzuf benefits from having a spare.
    enabledByDefault: false,

    buildInput: (ctx) => ({
        keyword: ctx.query,
        // This actor offers no window shorter than a week.
        maxJobAge: ctx.maxAgeDays && ctx.maxAgeDays <= 7 ? "7 days" : "all",
        results_wanted: ctx.limit,
        max_pages: 5,
        proxyConfiguration: { useApifyProxy: false },
    }),

    mapRow: (row) => ({
        title: clean(row.title),
        company: clean(row.company) || "Confidential",
        location: clean(row.location),
        job_type: inferJobType(row.job_type, row.location),
        description: "",
        apply_url: clean(row.url),
        salary_text: clean(row.salary) || null,
        posted_at_source: toTimestamp(row.date_posted),
        source_key: "apify_wuzzuf_alt",
        external_id: clean(row.url),
    }),
};

const gulftalent: ApifyActorSpec = {
    key: "apify_gulftalent",
    actorId: "eab5UbCFxMxHUun5X",
    slug: "scrapestorm/gulftalent-job-scraper---cheap",
    label: "GulfTalent (Apify)",
    summary: "Gulf professional roles. Carries the employer's own website on every row.",
    countries: ["AE", "SA", "EG", "QA", "JO", "LB", "OM", "KW"],
    language: "en",
    pricing: {
        model: "monthly",
        note: "$19.89 per month, not per use — a rental. 120 free trial minutes. Only worth switching on if you will search often.",
    },
    hasDescription: false,
    // Off, and it must stay off by default: it is the one actor here that bills
    // a flat monthly fee, so enabling it for everyone would silently subscribe
    // every user to something most of them would not use.
    enabledByDefault: false,

    buildInput: (ctx) => ({
        keywords: [ctx.query],
        location: GULFTALENT_LOCATIONS[ctx.countries[0]?.code ?? ""] ?? "All countries",
        max_items: ctx.limit,
    }),

    mapRow: (row) => ({
        title: clean(row.jobTitle),
        company: clean(row.companyName) || "Confidential",
        location: clean(row.location),
        job_type: inferJobType(row.jobTitle, row.location),
        description: "",
        apply_url: clean(row.jobUrl),
        salary_text: null,
        posted_at_source: toTimestamp(row.postedDate),
        source_key: "apify_gulftalent",
        external_id: clean(pick(row, ["jobId", "jobUrl"], "")),
        // The company's own site, handed over for free — exactly what the
        // enrichment pass would otherwise spend three requests discovering.
        company_links: clean(row.companyUrl)
            ? { website: clean(row.companyUrl), linkedin: null, careers: null }
            : undefined,
    }),
};

const GULFTALENT_LOCATIONS: Record<string, string> = {
    AE: "UAE", SA: "Saudi Arabia", EG: "Egypt", QA: "Qatar",
    JO: "Jordan", LB: "Lebanon", OM: "Oman", KW: "Kuwait",
};

const linkedin: ApifyActorSpec = {
    key: "apify_linkedin",
    actorId: "RIGGeqD6RqKmlVoQU",
    slug: "valig/linkedin-jobs-scraper",
    label: "LinkedIn (Apify)",
    summary: "LinkedIn job search with real filters, run through Apify. The only lawful route to LinkedIn here.",
    countries: null,
    language: "en",
    pricing: { model: "per-result", note: "$0.0004 per result - about $0.04 for 100 jobs. The cheapest actor in this list." },
    hasDescription: true,
    // On: LinkedIn is where MENA professional hiring actually advertises, it is
    // the cheapest actor here, and `apify_all_jobs` only reaches it as one of
    // 39 sites with no LinkedIn-specific filters.
    enabledByDefault: true,

    buildInput: (ctx) => ({
        keywords: ctx.query,
        location: ctx.worldwide ? undefined : ctx.countries[0]?.name,
        // LinkedIn's own posted-within codes, in seconds.
        datePosted: ctx.maxAgeDays && ctx.maxAgeDays <= 1 ? "r86400" : "r604800",
        limit: ctx.limit,
    }),

    /*
     * Read defensively, because this actor publishes no output schema.
     *
     * Apify actors are required to declare their *input* shape and almost none
     * declare their output, so these names come from the actor's documentation
     * rather than from a contract. `ApifySource` counts rows that map to no
     * title and reports the field names it actually saw, so a rename surfaces
     * as a named problem in `meta.actors` instead of a confident zero that
     * still bills.
     */
    mapRow: (row) => ({
        title: clean(pick(row, ["title", "jobTitle", "position"], "")),
        company: clean(pick(row, ["companyName", "company", "companyUrl.name"], "")) || "Unknown",
        location: clean(pick(row, ["location", "jobLocation", "formattedLocation"], "")),
        job_type: inferJobType(
            pick(row, ["workType", "workplaceType", "employmentType", "contractType"], ""),
            pick(row, ["location"], "")
        ),
        description: String(pick(row, ["description", "descriptionText", "jobDescription"], "")),
        apply_url: clean(pick(row, ["jobUrl", "url", "link", "applyUrl"], "")),
        salary_text: clean(pick(row, ["salary", "salaryInfo", "compensation"], "")) || null,
        posted_at_source: toTimestamp(pick(row, ["publishedAt", "postedAt", "postedTime", "listedAt"], null)),
        source_key: "apify_linkedin",
        external_id: clean(pick(row, ["jobId", "id", "jobUrl", "url"], "")),
        // LinkedIn names the employer's own page on most rows, which saves the
        // enrichment pass a three-request crawl.
        company_links: clean(pick(row, ["companyUrl", "companyWebsite"], ""))
            ? { website: clean(pick(row, ["companyUrl", "companyWebsite"], "")), linkedin: null, careers: null }
            : undefined,
    }),
};

const careerSite: ApifyActorSpec = {
    key: "apify_career_sites",
    actorId: "s3dtSTZSZWFtAVLn5",
    slug: "fantastic-jobs/career-site-job-listing-api",
    label: "Company career sites (Apify)",
    summary:
        "Jobs straight from companies' own career pages, with full HTML descriptions and a stated hiring region.",
    countries: null,
    language: "en",
    pricing: { model: "per-result", note: "$0.012 per job on the free tier — about $1.20 for 100 jobs." },
    hasDescription: true,
    enabledByDefault: true,

    buildInput: (ctx) => ({
        titleSearch: [ctx.query],
        locationSearch: ctx.worldwide ? [] : ctx.countries.map((country) => country.name),
        timeRange: ctx.maxAgeDays && ctx.maxAgeDays <= 1 ? "24h" : "7d",
        limit: ctx.limit,
        // The one actor that offers a choice, and the reason job descriptions
        // from this source keep their bullet lists.
        descriptionType: "html",
        includeCompanyDetails: true,
    }),

    mapRow: (row) => {
        const locations = Array.isArray(row.locations_derived)
            ? (row.locations_derived as unknown[]).map(String)
            : [];
        const requirements = Array.isArray(row.location_requirements)
            ? (row.location_requirements as unknown[]).map(String)
            : [];
        const remote = String(row.location_type ?? "").toUpperCase().includes("TELECOMMUTE");

        return {
            title: clean(row.title),
            company: clean(row.organization) || "Unknown",
            /*
             * For a remote role the hiring *requirement* is the answer, not the
             * office address — a role headquartered in Berlin that hires across
             * EMEA is not a Berlin role. This is the same rule the JSON-LD
             * mapper follows, and it is what the eligibility filter reads.
             */
            location: (remote && requirements.length ? requirements : locations).join(", "),
            job_type: remote ? "remote" : inferJobType(row.location_type, locations.join(" ")),
            description: String(row.description ?? ""),
            apply_url: clean(row.url),
            salary_text: clean(row.salary) || null,
            posted_at_source: toTimestamp(pick(row, ["date_posted", "date_created"], null)),
            source_key: "apify_career_sites",
            external_id: clean(pick(row, ["id", "url"], "")),
            company_links: clean(row.organization_url)
                ? { website: clean(row.organization_url), linkedin: null, careers: null }
                : undefined,
        };
    },
};

const allJobs: ApifyActorSpec = {
    key: "apify_all_jobs",
    actorId: "jpraRc4MCUh5ehbHV",
    slug: "agentx/all-jobs-scraper",
    label: "39 job sites (Apify)",
    summary: "LinkedIn, Indeed, Glassdoor, Talent.com and 35 more in one run, with descriptions and skills.",
    countries: null,
    language: "en",
    pricing: { model: "per-run", note: "Charged per actor start, by memory." },
    hasDescription: true,
    enabledByDefault: true,

    buildInput: (ctx) => ({
        keyword: ctx.query,
        // This actor wants a country *name*, and it is required — so a
        // worldwide search still has to name one. Egypt is the house default.
        country: ctx.countries[0]?.name ?? "Egypt",
        max_results: ctx.limit,
        remote_only: ctx.workPreference.length === 1 && ctx.workPreference[0] === "remote",
        posted_since: ctx.maxAgeDays && ctx.maxAgeDays <= 1 ? "24 hours" : undefined,
    }),

    mapRow: (row) => ({
        title: clean(row.title),
        company: clean(row.company_name) || "Unknown",
        location: clean(row.location),
        job_type: row.is_remote === true ? "remote" : inferJobType(row.work_mode, row.location),
        description: String(row.description ?? ""),
        // `platform_url` is the aggregator's page; `official_url` is the
        // company's own posting. Preferring the latter is the whole point of
        // the enrichment work — when the actor already knows it, take it.
        apply_url: clean(pick(row, ["official_url", "platform_url"], "")),
        salary_text: salaryFrom(row),
        posted_at_source: toTimestamp(row.posted_date),
        source_key: "apify_all_jobs",
        external_id: clean(pick(row, ["platform_url", "official_url"], "")),
    }),
};

function salaryFrom(row: Record<string, unknown>): string | null {
    const min = Number(row.salary_minimum ?? 0);
    if (!min) return null;
    const max = Number(row.salary_maximum ?? 0);
    const range = max > min ? `${min} - ${max}` : String(min);
    return [range, clean(row.salary_currency), clean(row.salary_period)].filter(Boolean).join(" ");
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The catalogue, in the order the marketplace shows it.
 *
 * Defaults are the four that do not overlap each other and do not bill a
 * subscription: Wuzzuf and Bayt for MENA, career sites and the 39-site
 * aggregator for everything else. The other three are real options a user might
 * want — a second scraper for a site that breaks often, a richer Bayt, a Gulf
 * specialist — but none of them should cost anyone money without being chosen.
 */
export const APIFY_ACTORS: ApifyActorSpec[] = [
    wuzzufApify,
    baytApify,
    linkedin,
    careerSite,
    allJobs,
    baytMemo,
    wuzzufShahid,
    gulftalent,
];

export const actorByKey = new Map(APIFY_ACTORS.map((actor) => [actor.key, actor]));

export function defaultActorKeys(): string[] {
    return APIFY_ACTORS.filter((actor) => actor.enabledByDefault).map((actor) => actor.key);
}

/**
 * Which of the requested actors are worth running for this search.
 *
 * A MENA-only actor has nothing to offer a worldwide-remote search, and running
 * it anyway spends the user's credit to collect rows the geography filter will
 * then discard.
 */
export function selectActors(requested: string[] | undefined, ctx: SearchContext): ApifyActorSpec[] {
    const keys = requested?.length ? requested : defaultActorKeys();

    return keys
        .map((key) => actorByKey.get(key))
        .filter((actor): actor is ApifyActorSpec => Boolean(actor))
        .filter((actor) => {
            if (actor.countries === null) return true;
            if (ctx.worldwide && ctx.countries.length === 0) return false;
            if (ctx.countries.length === 0) return true;
            return ctx.countries.some((country) => actor.countries?.includes(country.code));
        });
}
