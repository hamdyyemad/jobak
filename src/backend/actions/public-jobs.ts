import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import { sanitizeDescription } from "@/backend/lib/html/sanitize-description";
import { logServerError } from "@/backend/lib/errors";

/**
 * The job pool, as anyone may see it.
 *
 * Reads with the ordinary anon client, not the service role. That is the point:
 * the "Anyone can read active jobs" policy in `supabase/public-jobs.sql` is what
 * makes these pages work, so if that policy were ever tightened these pages
 * would go empty rather than quietly keep serving data past a permission change.
 *
 * `user_job_matches` is never touched here. Scores, bookmarks and who-was-shown-
 * what stay per-user and private; a public visitor sees the listing and nothing
 * about anyone's relationship to it.
 */

export interface PublicJob {
  slug: string;
  title: string;
  company: string;
  location: string;
  workplace: "remote" | "onsite" | "hybrid";
  salary: string | null;
  postedAt: string | null;
  /** Sanitised HTML — safe to render. */
  description: string;
  applyUrl: string;
  source: string | null;
  tags: string[];
  companyWebsite: string | null;
  companyLinkedin: string | null;
  companyCareers: string | null;
}

/** Card-sized subset, for the index. */
export type PublicJobCard = Pick<
  PublicJob,
  "slug" | "title" | "company" | "location" | "workplace" | "salary" | "postedAt" | "source" | "tags"
>;

const CARD_COLUMNS =
  "public_slug, title, company, location, job_type, salary_text, posted_at_source, created_at, tech_stack, sources(display_name)";

const FULL_COLUMNS = `${CARD_COLUMNS}, description, apply_url, companies(website, linkedin_url, careers_url)`;

interface Row {
  public_slug: string | null;
  title: string;
  company: string;
  location: string | null;
  job_type: string | null;
  salary_text: string | null;
  posted_at_source: string | null;
  created_at: string;
  tech_stack: string[] | null;
  description?: string | null;
  apply_url?: string;
  sources?: { display_name: string } | { display_name: string }[] | null;
  companies?:
    | { website: string | null; linkedin_url: string | null; careers_url: string | null }
    | { website: string | null; linkedin_url: string | null; careers_url: string | null }[]
    | null;
}

/** PostgREST returns an embedded to-one as an object or a one-element array depending on the hint. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toWorkplace(raw: string | null): PublicJob["workplace"] {
  return raw === "remote" || raw === "hybrid" ? raw : "onsite";
}

function toCard(row: Row): PublicJobCard {
  return {
    slug: row.public_slug ?? "",
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    workplace: toWorkplace(row.job_type),
    salary: row.salary_text || null,
    postedAt: row.posted_at_source ?? row.created_at,
    source: one(row.sources)?.display_name ?? null,
    tags: Array.isArray(row.tech_stack) ? row.tech_stack.slice(0, 6) : [],
  };
}

/**
 * The markets this product is for.
 *
 * Jobak exists for candidates in MENA, and the public jobs page was showing the
 * pool in pure recency order — which on a busy collection day is a wall of
 * remote-worldwide listings with Cairo and Riyadh buried underneath. These
 * codes drive both the default ordering and the region filter.
 */
export const MENA_COUNTRIES = [
  "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ",
  "MA", "TN", "DZ", "LY", "SD", "PS", "SY", "YE", "MR", "SO", "DJ", "KM",
];

export type RegionFilter = "mena" | "remote" | "all";
export type WorkplaceFilter = "all" | "remote" | "hybrid" | "onsite";

export interface JobQuery {
  region?: RegionFilter;
  workplace?: WorkplaceFilter;
  search?: string;
  limit?: number;
}

/**
 * The listings for `/jobs`.
 *
 * Ordered by when *we* collected it rather than by `posted_at_source`: a board
 * that backdates or omits its posting date would otherwise sink to the bottom
 * forever, and "new to Jobak" is what this page is actually claiming.
 *
 * `region: "mena"` is the default because of who this is for. It matches on the
 * region FK rather than on the location text — `regions.country_code` is what
 * the collector resolved, and re-deriving a country from free text here would
 * repeat work the scraper already did more carefully.
 */
export const getPublicJobs = cache(async (query: JobQuery = {}): Promise<PublicJobCard[]> => {
  const { region = "mena", workplace = "all", search = "", limit = 60 } = query;

  try {
    const supabase = await createClient();

    let builder = supabase
      .from("jobs")
      .select(CARD_COLUMNS)
      .not("public_slug", "is", null);

    if (workplace !== "all") builder = builder.eq("job_type", workplace);

    if (search.trim()) {
      // Escaped: a comma or a parenthesis in the term is PostgREST syntax, and
      // job titles are full of both — "Mobile Engineer (iOS)" would break it.
      const term = search.trim().replace(/[,()]/g, " ").slice(0, 80);
      builder = builder.or(`title.ilike.%${term}%,company.ilike.%${term}%`);
    }

    if (region === "mena") {
      const regionIds = await menaRegionIds();
      /*
       * Remote roles stay in even on a MENA filter: a remote listing open to
       * anywhere is available to someone in Cairo, and `region_id` is null on
       * most of them because the collector had no country to attribute.
       */
      if (regionIds.length > 0) {
        builder = builder.or(`region_id.in.(${regionIds.join(",")}),job_type.eq.remote`);
      }
    } else if (region === "remote") {
      builder = builder.eq("job_type", "remote");
    }

    const { data, error } = await builder.order("created_at", { ascending: false }).limit(limit);

    if (error) {
      logServerError("public-jobs:list", error);
      return [];
    }

    return ((data ?? []) as unknown as Row[]).map(toCard);
  } catch (error) {
    // `cookies()` throws a DynamicServerError during static generation as a
    // control-flow signal. Handing it back to Next before logging keeps the
    // build output honest — it was reporting these as errors on every build.
    unstable_rethrow(error);
    logServerError("public-jobs:list", error);
    return [];
  }
});

/**
 * `regions.id` for every MENA country, resolved once per request.
 *
 * The collector stores geography as `jobs.region_id -> regions(id)`, so a
 * country filter is an id lookup rather than a string match. Cached because the
 * list page and any filtered variant of it both need the same answer.
 */
const menaRegionIds = cache(async (): Promise<number[]> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("regions").select("id").in("country_code", MENA_COUNTRIES);
    return (data ?? []).map((row) => row.id as number);
  } catch (error) {
    unstable_rethrow(error);
    // Without the lookup the page shows everything rather than nothing — a
    // wider list is a worse page, an empty one is a broken page.
    return [];
  }
});

export const getPublicJob = cache(async (slug: string): Promise<PublicJob | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(FULL_COLUMNS)
      .eq("public_slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) logServerError("public-jobs:detail", error);
      return null;
    }

    const row = data as unknown as Row;
    const company = one(row.companies);

    return {
      ...toCard(row),
      // Sanitised again at the boundary. The scraper already writes a safe
      // subset, but this page renders to anonymous visitors and the n8n
      // collectors also write `jobs.description` — see sanitize-description.ts.
      description: sanitizeDescription(row.description),
      applyUrl: row.apply_url ?? "",
      companyWebsite: company?.website ?? null,
      companyLinkedin: company?.linkedin_url ?? null,
      companyCareers: company?.careers_url ?? null,
    };
  } catch (error) {
    unstable_rethrow(error);
    logServerError("public-jobs:detail", error);
    return null;
  }
});

/** Relative for the first week, then an absolute date. */
export function formatPostedAt(iso: string | null): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const hours = Math.floor((Date.now() - date.getTime()) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
