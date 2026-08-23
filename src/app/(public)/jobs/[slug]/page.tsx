import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Banknote, Building2, Clock, MapPin, Wifi } from "lucide-react";
import { LinkedInIcon } from "@/frontend/components/shared/brand-icons";
import { formatPostedAt, getPublicJob } from "@/backend/actions/public-jobs";
import { isProductionSite } from "@/frontend/lib/configs/site";

/**
 * One job, readable by anyone.
 *
 * This is the page the LinkedIn posts point at, which decides two things about
 * how it is built:
 *
 *  - **The metadata matters as much as the page.** LinkedIn renders a link
 *    preview from Open Graph tags, and a post whose card says "Jobak" with no
 *    title gets scrolled past. `generateMetadata` below is the actual product
 *    here.
 *  - **It must render for a signed-out visitor**, so nothing on it may touch a
 *    per-user table. Scores and bookmarks live on `user_job_matches` and are
 *    deliberately absent.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Rendered per request, not cached.
 *
 * `export const revalidate` was here and did nothing: the `(public)` layout
 * calls `isSignedIn()` to decide whether the nav says "Sign in" or "Dashboard",
 * that reads cookies, and one cookie read opts every page in the group into
 * dynamic rendering. The build confirms it — these routes come out as `ƒ`, not
 * `○`.
 *
 * That is fine at this scale: one indexed query per view. If a LinkedIn post
 * ever makes this the hot path, the fix is to move the auth read out of the
 * shared layout rather than to add a `revalidate` that the layout overrules.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublicJob(slug);

  if (!job) return { title: "Job not found — Jobak" };

  const where = [job.location, job.workplace === "remote" ? "Remote" : null]
    .filter(Boolean)
    .join(" · ");

  const title = `${job.title} at ${job.company}`;
  /*
   * Built from fields rather than from the description: LinkedIn truncates the
   * preview at roughly 100 characters, and the first line of a job description
   * is almost always boilerplate about the company.
   */
  const description = [where, job.salary, "Apply via Jobak"].filter(Boolean).join(" · ");

  return {
    title: `${title} — Jobak`,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/jobs/${job.slug}`,
      siteName: "Jobak",
    },
    twitter: { card: "summary_large_image", title, description },
    // Preview deployments stay out of the index; the shared metadata helper
    // makes the same call for every other page.
    robots: isProductionSite ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function PublicJobPage({ params }: PageProps) {
  const { slug } = await params;
  const job = await getPublicJob(slug);

  if (!job) notFound();

  /*
   * schema.org JobPosting, for the same reason this service *reads* it from
   * other boards: it is the contract search engines and aggregators understand.
   * A page that consumes structured data and publishes none would be taking
   * without giving.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.postedAt,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(job.companyWebsite ? { sameAs: job.companyWebsite } : {}),
    },
    ...(job.workplace === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.location
      ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } } }
      : {}),
    directApply: false,
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <script
        type="application/ld+json"
        // Serialised from values we control, not from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground mb-8"
          >
            <span className="w-8 h-px bg-foreground/30" />
            All jobs
          </Link>

          <h1 className="text-3xl lg:text-5xl font-display tracking-tight leading-[1.08] mb-4">
            {job.title}
          </h1>

          <p className="text-xl text-muted-foreground mb-8">{job.company}</p>

          <div className="flex flex-wrap gap-2 mb-10">
            {job.location && <Pill icon={MapPin}>{job.location}</Pill>}
            <Pill icon={job.workplace === "remote" ? Wifi : Building2} accent={job.workplace === "remote"}>
              {job.workplace === "onsite" ? "On-site" : job.workplace === "hybrid" ? "Hybrid" : "Remote"}
            </Pill>
            {job.salary && <Pill icon={Banknote}>{job.salary}</Pill>}
            <Pill icon={Clock}>{formatPostedAt(job.postedAt)}</Pill>
            {job.source && <Pill>via {job.source}</Pill>}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-12">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all"
            >
              Apply
              <ArrowUpRight className="w-4 h-4" />
            </a>

            {/*
              The employer's own front door, when enrichment resolved it. This is
              the payoff of the company-links work: an aggregator's apply button
              is a redirect, and these are the real thing.
            */}
            {job.companyCareers && (
              <a
                href={job.companyCareers}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border-standard text-sm hover:border-foreground/40 transition-all"
              >
                <Building2 className="w-4 h-4" />
                All roles at {job.company}
              </a>
            )}

            {job.companyLinkedin && (
              <a
                href={job.companyLinkedin}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border-standard text-sm hover:border-foreground/40 transition-all"
                aria-label={`${job.company} on LinkedIn`}
              >
                <LinkedInIcon className="w-4 h-4" />
                LinkedIn
              </a>
            )}
          </div>

          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs bg-accent/8 border border-accent/20 text-accent-text"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {job.description ? (
            <article
              className="max-w-none text-[15px] leading-relaxed text-muted-foreground
                         [&_p]:my-4
                         [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-1.5
                         [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-1.5
                         [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2
                         [&_h4]:text-foreground [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2
                         [&_strong]:text-foreground [&_b]:text-foreground
                         [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words
                         [&_blockquote]:border-l-2 [&_blockquote]:border-border-standard [&_blockquote]:pl-4 [&_blockquote]:italic"
              // Sanitised server-side in `getPublicJob`; see
              // backend/lib/html/sanitize-description.ts for the allowlist.
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <p className="text-muted-foreground">
              This source publishes no description. Open the listing to read the full posting.
            </p>
          )}

          <div className="mt-16 pt-8 border-t border-border-subtle">
            <p className="text-sm text-muted-foreground">
              Jobak collects openings from MENA boards, remote job boards and companies&apos; own
              career pages, then scores them against your profile.{" "}
              <Link href="/register" className="text-accent underline underline-offset-2">
                Create a free account
              </Link>{" "}
              to get matches like this one.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pill({
  icon: Icon,
  children,
  accent,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
        accent
          ? "border-accent/30 bg-accent/8 text-accent-text"
          : "border-border-standard text-muted-foreground"
      }`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
