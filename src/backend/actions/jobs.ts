"use server";

import { createClient } from "@/backend/lib/supabase/server";
import { Job, Source } from "@/frontend/types/dashboard";

const SOURCE_ID_TO_NAME: Record<number, Source> = {
  1: "Wuzzuf",
  2: "RemoteOK",
  3: "Remotive",
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
        type: mapJobType(job.job_type as string),
        salary: (job.salary_text as string) || "—",
        score: row.score ?? 0,
        source: SOURCE_ID_TO_NAME[job.source_id as number] ?? "Wuzzuf",
        link: job.apply_url as string,
        postedAt: formatDate(job.posted_at_source as string | null ?? job.created_at as string),
        bookmarked: row.is_bookmarked ?? false,
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

function mapJobType(raw: string): Job["type"] {
  if (raw === "remote" || raw === "onsite" || raw === "hybrid") {
    // Map DB types to display types
    const map: Record<string, Job["type"]> = {
      remote: "full-time",
      onsite: "full-time",
      hybrid: "full-time",
    };
    return map[raw] ?? "full-time";
  }
  const valid: Job["type"][] = ["full-time", "part-time", "freelance", "contract"];
  return valid.includes(raw as Job["type"]) ? (raw as Job["type"]) : "full-time";
}

function formatDate(iso: string | null): string {
  if (!iso) return "Recently";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}
