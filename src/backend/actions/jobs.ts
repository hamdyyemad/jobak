"use server";

import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { Job, Workplace } from "@/frontend/types/dashboard";
import { sanitizeDescription } from "@/backend/lib/html/sanitize-description";

/**
 * How much of the pool to consider before narrowing by title in memory.
 *
 * Title matching cannot go in the query: PostgREST's `or=` treats commas and
 * parentheses as syntax, and the catalogue is full of both ("Mobile Engineer
 * (iOS)"). So the database narrows on the things it can index — active, work
 * arrangement, region — and the titles are matched here.
 */
const POOL_WINDOW = 400;

/** What the dashboard will show after narrowing. */
const MAX_RESULTS = 100;

/** `user_preferences.work_preference` spells it "on-site"; `jobs.job_type` does not. */
const WORKPLACE_BY_PREFERENCE: Record<string, string> = {
  remote: "remote",
  "on-site": "onsite",
  hybrid: "hybrid",
};

interface PoolRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  job_type: string | null;
  description: string | null;
  tech_stack: string[] | null;
  salary_text: string | null;
  apply_url: string;
  posted_at_source: string | null;
  source_id: number | null;
  created_at: string;
}

/**
 * The jobs worth showing this user, from the shared pool.
 *
 * Reads `jobs` rather than only `user_job_matches`, because collection and
 * scoring are separate now: the collectors fill the pool continuously, and the
 * matcher scores it per user afterwards. Waiting for a score to show anything
 * meant a new user stared at an empty dashboard for the length of a scoring run.
 *
 * A score is attached where one exists and left at zero where it does not, so
 * matched jobs still sort to the top and unscored ones are visible underneath
 * instead of hidden.
 */
/**
 * The user's match rows, tolerating a database that has not been migrated yet.
 *
 * `match_reason`, `scored_at` and `tech_stack` arrive with
 * `supabase/fix-matching.sql`. Selecting a column PostgREST does not know about
 * fails the whole query, which would empty the dashboard for anyone who has not
 * run it — a worse outcome than losing the two fields those columns feed. So
 * the richer select is tried first and the original one is the fallback.
 *
 * Delete this once the migration has been applied everywhere.
 */
async function readMatches(
  service: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<{ data: Record<string, unknown>[] | null }> {
  const full = await service
    .from("user_job_matches")
    .select("job_id, score, is_bookmarked, match_reason, scored_at, tech_stack")
    .eq("user_id", userId);

  if (!full.error) return { data: full.data as Record<string, unknown>[] | null };

  console.warn(
    "getUserJobs: user_job_matches is missing the scoring columns — run supabase/fix-matching.sql. " +
      "Falling back: scores still show, but there is no way to tell an unscored job from a zero."
  );

  const basic = await service
    .from("user_job_matches")
    .select("job_id, score, is_bookmarked")
    .eq("user_id", userId);

  return { data: basic.data as Record<string, unknown>[] | null };
}

export async function getUserJobs(): Promise<Job[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Service role: the pool is shared, and it is not readable per-user under RLS.
  const service = createServiceClient();

  const { data: prefs } = await service
    .from("user_preferences")
    .select("job_titles, location, work_preference")
    .eq("user_id", user.id)
    .single();

  const titles: string[] = (prefs?.job_titles ?? []).filter(Boolean);
  const location = (prefs?.location ?? {}) as { countries?: string[]; worldwide?: boolean };
  const workPreference: string[] = prefs?.work_preference ?? [];

  // Without a profile there is nothing to narrow by, and showing the entire
  // pool would be noise rather than a dashboard.
  if (titles.length === 0) return [];

  let query = service
    .from("jobs")
    .select(
      "id, title, company, location, job_type, description, tech_stack, salary_text, apply_url, posted_at_source, source_id, created_at"
    )
    .eq("is_active", true)
    .order("posted_at_source", { ascending: false, nullsFirst: false })
    .limit(POOL_WINDOW);

  const workplaces = workPreference
    .map((preference) => WORKPLACE_BY_PREFERENCE[preference])
    .filter(Boolean);

  if (workplaces.length > 0) {
    query = query.in("job_type", workplaces);
  }

  /*
   * Geography, only when the user named somewhere. `region_id` is null on
   * anything the collector could not attribute — remote-first boards mostly —
   * and those are exactly the listings a country-specific search still wants,
   * so they stay in rather than being filtered out.
   */
  const countries = (location.countries ?? []).filter(Boolean);
  if (!location.worldwide && countries.length > 0) {
    const { data: regions } = await service
      .from("regions")
      .select("id")
      .in("country_code", countries);

    const regionIds = (regions ?? []).map((r) => r.id);
    if (regionIds.length > 0) {
      query = query.or(`region_id.in.(${regionIds.join(",")}),region_id.is.null`);
    }
  }

  const [{ data: pool, error }, { data: matches }, { data: sources }] = await Promise.all([
    query,
    readMatches(service, user.id),
    service.from("sources").select("id, display_name"),
  ]);

  if (error) {
    console.error("getUserJobs error:", error);
    return [];
  }

  /*
   * Source names come from the table rather than a constant. A hardcoded id map
   * lived here and in the n8n workflows, and both drifted out of step with the
   * rows that actually exist — an unknown id now reads "Other" because the row
   * is genuinely missing, not because the map is stale.
   */
  const sourceName = new Map((sources ?? []).map((s) => [s.id as number, s.display_name as string]));
  /*
   * `scored_at` is what separates "the model looked at this and rated it 12"
   * from "nothing has looked at this yet". Both used to arrive as score 0, so
   * an unscored pool job was indistinguishable from a terrible match — which is
   * most of why the AI scoring looked like it was not running at all.
   */
  const matchByJob = new Map(
    (matches ?? []).map((m) => [
      m.job_id as string,
      {
        /*
         * Post-migration `scored_at` is the authority. Before it exists the
         * column is absent from the row entirely, and the best available signal
         * is "there is a score" — which is what this used to assume anyway.
         */
        score:
          "scored_at" in m
            ? (m.scored_at ? ((m.score as number) ?? 0) : null)
            : ((m.score as number | null) ?? null),
        bookmarked: (m.is_bookmarked as boolean) ?? false,
        reason: (m.match_reason as string | null) ?? null,
        techStack: Array.isArray(m.tech_stack) ? (m.tech_stack as string[]) : [],
      },
    ])
  );

  const wanted = titles.map(normalise);

  return ((pool ?? []) as PoolRow[])
    .filter((job) => wanted.some((title) => titleMatches(normalise(job.title), title)))
    .map((job) => {
      const match = matchByJob.get(job.id);
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location ?? "",
        // The pool stores workplace type; contract type is not collected, so
        // it is not invented here either.
        type: "full-time",
        workplace: toWorkplace(job.job_type ?? ""),
        salary: job.salary_text || "—",
        // null means "not scored yet", not "scored zero".
        score: match?.score ?? null,
        source: (job.source_id !== null && sourceName.get(job.source_id)) || "Other",
        link: job.apply_url,
        postedAt: formatDate(job.posted_at_source ?? job.created_at),
        bookmarked: match?.bookmarked ?? false,
        remote: job.job_type === "remote",
        /*
         * The model's read on the stack beats the source's: most boards publish
         * no tech stack at all, and `jobs.tech_stack` is empty on nearly every
         * row as a result.
         */
        tags: match?.techStack.length ? match.techStack : Array.isArray(job.tech_stack) ? job.tech_stack : [],
        description: sanitizeDescription(job.description),
        /*
         * The scorer has always been asked for this and the workflow always
         * threw it away, so "Why it matches your CV" had nothing to render.
         */
        matchReasons: match?.reason ? [match.reason] : undefined,
      } satisfies Job;
    })
    /*
     * Scored jobs first, best first; unscored underneath in pool order rather
     * than mixed in at an implied zero.
     */
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, MAX_RESULTS);
}

export async function toggleBookmarkAction(jobId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const service = createServiceClient();

  const { data: existing } = await service
    .from("user_job_matches")
    .select("is_bookmarked")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  const newValue = !(existing?.is_bookmarked ?? false);

  /*
   * Upsert, not update. The dashboard now lists pool jobs the matcher has not
   * scored yet, and those have no match row — an update would report success
   * while changing nothing, and the star would spring back on reload.
   */
  const { error } = await service
    .from("user_job_matches")
    .upsert(
      { user_id: user.id, job_id: jobId, is_bookmarked: newValue },
      { onConflict: "user_id,job_id" }
    );

  if (error) {
    console.error("toggleBookmark error:", error);
    return existing?.is_bookmarked ?? false;
  }

  return newValue;
}

/** Lowercase, punctuation stripped, so "Mobile Engineer (iOS)" can match "mobile engineer ios". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a posting's title is the role the user asked for.
 *
 * Substring alone is too narrow — "Senior Backend Engineer, Payments" does not
 * contain "backend engineer" as a phrase once punctuation is stripped, but it is
 * plainly the same job. Requiring every significant word of the target instead
 * keeps that match and still rejects "Engineering Manager".
 */
function titleMatches(jobTitle: string, target: string): boolean {
  if (!target) return false;
  if (jobTitle.includes(target)) return true;

  const words = target.split(" ").filter((w) => w.length > 2);
  return words.length > 0 && words.every((word) => jobTitle.includes(word));
}

/**
 * `jobs.job_type` is the workplace arrangement, not the contract type.
 *
 * The previous mapping collapsed remote / onsite / hybrid all to "full-time",
 * which threw away the only geography signal the card had and told the user
 * something the posting never said.
 */
function toWorkplace(raw: string): Workplace {
  return raw === "remote" || raw === "hybrid" ? raw : "onsite";
}

/** Relative for the first week, then an absolute date. */
function formatDate(iso: string | null): string {
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
