import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Clock, MapPin, Wifi } from "lucide-react";
import {
  formatPostedAt,
  getPublicJobs,
  type RegionFilter,
  type WorkplaceFilter,
} from "@/backend/actions/public-jobs";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { isProductionSite } from "@/frontend/lib/configs/site";
import { JsonLd } from "@/frontend/components/shared/json-ld";

/**
 * The public jobs board.
 *
 * Two things shape it:
 *
 *  - **MENA is the default view**, not "everything, newest first". Recency
 *    order on a busy collection day buries Cairo and Riyadh under a wall of
 *    remote-worldwide listings, which is the opposite of who this is for.
 *  - **Filters are links, not state.** Every combination is a real URL, so it
 *    is crawlable, shareable and works with no JavaScript — and the LinkedIn
 *    posts can point at a filtered view when that is the better landing page.
 */

interface PageProps {
  searchParams: Promise<{ region?: string; workplace?: string; q?: string }>;
}

const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: "mena", label: "MENA" },
  { value: "remote", label: "Remote" },
  { value: "all", label: "Everywhere" },
];

const WORKPLACES: { value: WorkplaceFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

function readRegion(value: string | undefined): RegionFilter {
  return value === "remote" || value === "all" ? value : "mena";
}

function readWorkplace(value: string | undefined): WorkplaceFilter {
  return value === "remote" || value === "hybrid" || value === "onsite" ? value : "all";
}

/** Only the non-default parts, so the canonical `/jobs` stays clean. */
function hrefFor(next: { region?: RegionFilter; workplace?: WorkplaceFilter; q?: string }): string {
  const params = new URLSearchParams();
  if (next.region && next.region !== "mena") params.set("region", next.region);
  if (next.workplace && next.workplace !== "all") params.set("workplace", next.workplace);
  if (next.q) params.set("q", next.q);
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const region = readRegion(params.region);
  const workplace = readWorkplace(params.workplace);

  const scope =
    region === "mena" ? "in MENA" : region === "remote" ? "remote worldwide" : "worldwide";
  const kind = workplace === "all" ? "" : `${WORKPLACES.find((w) => w.value === workplace)?.label} `;

  const title = `Latest ${kind}jobs ${scope}`;
  const description =
    `New ${kind.toLowerCase()}openings ${scope}, collected from Wuzzuf, Bayt, Talent.com, LinkedIn, ` +
    "remote job boards and companies' own career pages. Free to browse, no account needed.";

  /*
   * Every filtered view points its canonical at the unfiltered page. They are
   * the same listings in a different order, and letting each combination be
   * indexed separately is how a job board earns a duplicate-content penalty.
   */
  const filtered = region !== "mena" || workplace !== "all" || Boolean(params.q);

  return {
    title: `${title} — Jobak`,
    description,
    keywords: [
      "jobs in Egypt", "jobs in Saudi Arabia", "jobs in UAE", "MENA jobs",
      "remote jobs MENA", "وظائف", "وظائف مصر", "وظائف عن بعد",
    ],
    alternates: { canonical: "/jobs" },
    openGraph: {
      type: "website",
      title,
      description,
      url: hrefFor({ region, workplace, q: params.q }),
      siteName: "Jobak",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: isProductionSite
      ? { index: !filtered, follow: true }
      : { index: false, follow: false },
  };
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const region = readRegion(params.region);
  const workplace = readWorkplace(params.workplace);
  const search = (params.q ?? "").slice(0, 80);

  const jobs = await getPublicJobs({ region, workplace, search, limit: 60 });

  /*
   * An `ItemList` of the results — the same structure this service reads from
   * Bayt and Talent.com to discover their listings. Publishing it makes this
   * page legible to the aggregators that come looking.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest jobs on Jobak",
    numberOfItems: jobs.length,
    itemListElement: jobs.slice(0, 30).map((job, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/jobs/${job.slug}`,
      name: `${job.title} at ${job.company}`,
    })),
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      <PageIntro
        eyebrow="Jobs"
        title={
          <>
            The latest openings,
            <br />
            <span className="text-muted-foreground">no account needed.</span>
          </>
        }
        lead="Collected from Wuzzuf, Bayt, Talent.com, LinkedIn, remote job boards and companies' own career pages. Sign in to have them scored against your profile."
      />

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterRow
          label="Region"
          options={REGIONS}
          active={region}
          hrefFor={(value) => hrefFor({ region: value as RegionFilter, workplace, q: search })}
        />
        <FilterRow
          label="Workplace"
          options={WORKPLACES}
          active={workplace}
          hrefFor={(value) => hrefFor({ region, workplace: value as WorkplaceFilter, q: search })}
        />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {jobs.length === 0
          ? "No openings match this view."
          : `${jobs.length} opening${jobs.length === 1 ? "" : "s"}`}
        {region === "mena" && jobs.length > 0 && (
          <span className="text-muted-foreground/70">
            {" "}
            — MENA plus remote roles open to anywhere
          </span>
        )}
      </p>

      {jobs.length === 0 ? (
        <p className="mt-8 text-muted-foreground max-w-xl">
          Try{" "}
          <Link href={hrefFor({ region: "all", workplace: "all" })} className="text-accent underline underline-offset-2">
            widening to everywhere
          </Link>
          , or check back shortly — the collectors run continuously.
        </p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                {/*
                  Guarded because `jobs.location` held the literal string
                  "[object Object]" for the sources that publish a structured
                  location — see supabase/repair-job-data.sql. Repaired rows are
                  blank, and a blank location should render as nothing at all.
                */}
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
                {job.workplace === "hybrid" && <span>Hybrid</span>}
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

function FilterRow({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {options.map((option) => {
          const selected = active === option.value;
          return (
            <Link
              key={option.value}
              href={hrefFor(option.value)}
              // A filtered view is a different slice of the same listings, so it
              // is followed for discovery but not indexed as its own page.
              rel={selected ? undefined : "nofollow"}
              aria-current={selected ? "true" : undefined}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                selected
                  ? "bg-accent text-(--bg-canvas) border-accent"
                  : "border-border-standard text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
