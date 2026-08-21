"use server";

import { createClient } from "@/backend/lib/supabase/server";
import { Job, Workplace } from "@/frontend/types/dashboard";

/**
 * Mirrors the `sources` table. Kept in step with the ids the collectors write —
 * see the SOURCE_IDS map in the n8n pipeline and the seed rows in schema.sql.
 * An unmapped id renders as "Other" rather than silently borrowing a name.
 */
const SOURCE_ID_TO_NAME: Record<number, string> = {
  1: "Wuzzuf",
  2: "RemoteOK",
  3: "Remotive",
  4: "LinkedIn",
  5: "Indeed",
  6: "Arbeitnow",
  7: "Jobicy",
  8: "Himalayas",
  9: "We Work Remotely",
  10: "Greenhouse",
  11: "Ashby",
  12: "Workable",
};

export async function getUserJobs(): Promise<Job[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_job_matches")
    .select(
      `
      score,
      is_bookmarked,
      jobs (
        id,
        title,
        company,
        location,
        job_type,
        description,
        tech_stack,
        salary_text,
        apply_url,
        posted_at_source,
        source_id,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(100);

  if (error) {
    console.error("getUserJobs error:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.jobs)
    .map((row) => {
      const job = row.jobs as unknown as Record<string, unknown>;
      return {
        id: job.id as string,
        title: job.title as string,
        company: job.company as string,
        location: job.location as string,
        // The pool stores workplace type; contract type is not collected, so
        // it is not invented here either.
        type: "full-time",
        workplace: toWorkplace(job.job_type as string),
        salary: (job.salary_text as string) || "—",
        score: row.score ?? 0,
        source: SOURCE_ID_TO_NAME[job.source_id as number] ?? "Other",
        link: job.apply_url as string,
        postedAt: formatDate((job.posted_at_source as string | null) ?? (job.created_at as string)),
        bookmarked: row.is_bookmarked ?? false,
        remote: job.job_type === "remote",
        tags: Array.isArray(job.tech_stack) ? (job.tech_stack as string[]) : [],
        description: (job.description as string) || "",
      } satisfies Job;
    });
}

export async function toggleBookmarkAction(jobId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("user_job_matches")
    .select("is_bookmarked")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .single();

  const newValue = !(existing?.is_bookmarked ?? false);

  const { error } = await supabase
    .from("user_job_matches")
    .update({ is_bookmarked: newValue })
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (error) {
    console.error("toggleBookmark error:", error);
    return existing?.is_bookmarked ?? false;
  }

  return newValue;
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
