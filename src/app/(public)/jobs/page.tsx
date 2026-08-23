import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Clock, MapPin, Wifi } from "lucide-react";
import { formatPostedAt, getPublicJobs } from "@/backend/actions/public-jobs";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

export const metadata: Metadata = {
  title: "Latest jobs — Jobak",
  description:
    "New openings collected from MENA job boards, remote job boards and companies' own career pages. No account needed to browse.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    type: "website",
    title: "Latest jobs — Jobak",
    description: "New openings across MENA and remote-worldwide, updated continuously.",
    url: "/jobs",
    siteName: "Jobak",
  },
};

/*
 * Dynamic, like every page in the `(public)` group — see the note in
 * `jobs/[slug]/page.tsx`. The layout's auth read decides that, not this file.
 */

export default async function PublicJobsPage() {
  const jobs = await getPublicJobs(60);

  return (
    <PageShell>
      <PageIntro
        eyebrow="Jobs"
        title={
          <>
            The latest openings,
            <br />
            <span className="text-muted-foreground">no account needed.</span>
          </>
        }
        lead="Collected from Wuzzuf, Talent.com, remote job boards and companies' own career pages. Sign in to have them scored against your profile."
      />

      {jobs.length === 0 ? (
        <p className="mt-16 text-muted-foreground">
          Nothing collected yet. The collectors run continuously — check back shortly.
        </p>
      ) : (
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.slug}
              href={`/jobs/${job.slug}`}
              className="group flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2 hover:border-foreground/30 transition-all"
            >
              <h2 className="text-base font-semibold leading-snug group-hover:text-accent-text transition-colors">
                {job.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{job.company}</p>

              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[14rem]">{job.location}</span>
                  </span>
                )}
                {job.workplace === "remote" && (
                  <span className="inline-flex items-center gap-1.5 text-accent-text">
                    <Wifi className="w-3 h-3 shrink-0" />
                    Remote
                  </span>
                )}
                {job.salary && (
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[10rem]">{job.salary}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-4 text-xs text-muted-foreground/70">
                <Clock className="w-3 h-3 shrink-0" />
                {formatPostedAt(job.postedAt)}
                {job.source && <span className="ml-auto truncate">{job.source}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
