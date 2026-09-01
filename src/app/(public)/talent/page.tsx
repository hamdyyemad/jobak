import type { Metadata } from "next";
import Link from "next/link";
import { Globe, MapPin } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/frontend/components/shared/brand-icons";
import { getPublicTalent, type TalentCard } from "@/backend/actions/talent";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { JsonLd } from "@/frontend/components/shared/json-ld";

const TITLE = "Hire developers and designers in MENA";
const DESCRIPTION =
  "Candidates across Egypt, Saudi Arabia, the UAE and the wider MENA region who chose to be listed publicly. " +
  "Every profile here was published by the person it belongs to, with the fields they picked.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  keywords: [
    "hire developers MENA", "hire engineers Egypt", "hire developers Saudi Arabia",
    "MENA talent", "Egypt developers", "remote talent MENA", "مطورين", "توظيف",
  ],
  alternates: { canonical: "/talent" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/talent",
    siteName: "Jobak",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  /*
   * Followed but not indexed while the directory is opt-in and small. An
   * indexed page of a handful of real people is worse for them and for us than
   * no listing at all — and search engines rank a thin directory badly anyway.
   * Flip this to `index: true` once it has enough profiles to be worth finding.
   */
  robots: { index: false, follow: true },
};

/*
 * Rendered per request, which for this page is the property we want rather than
 * a cost to justify: someone who unpublishes expects their card gone, and any
 * amount of stale cache is that long serving a withdrawn consent.
 *
 * (It would be dynamic regardless — the `(public)` layout reads auth. But here
 * it is also the correct choice.)
 */

const WORKPLACE_LABEL: Record<string, string> = {
  remote: "Remote",
  "on-site": "On-site",
  hybrid: "Hybrid",
};

export default async function TalentPage() {
  const people = await getPublicTalent();

  /*
   * `ItemList` of `Person` entries — but only the fields already on the public
   * card. Structured data must never widen what a page discloses; it is the
   * same consent, in a machine-readable shape.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Talent on Jobak",
    numberOfItems: people.length,
    itemListElement: people.slice(0, 50).map((person, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Person",
        name: person.displayName ?? "Jobak member",
        ...(person.headline ? { jobTitle: person.headline } : {}),
        ...(person.linkedinUrl ? { sameAs: [person.linkedinUrl] } : {}),
        ...(person.location ? { address: person.location } : {}),
      },
    })),
  };

  return (
    <PageShell>
      {people.length > 0 && (
        <JsonLd data={jsonLd} />
      )}

      <PageIntro
        eyebrow="Talent"
        title={
          <>
            People looking,
            <br />
            <span className="text-muted-foreground">on their own terms.</span>
          </>
        }
        lead="Everyone here chose to be listed. Profiles are off by default, each person picks what their card shows, and nobody's email appears on this page."
      />

      {people.length === 0 ? (
        <div className="mt-16 max-w-xl">
          <p className="text-muted-foreground">
            Nobody has published a profile yet. If you have a Jobak account, you can add yours from{" "}
            <Link href="/dashboard/profile" className="text-accent underline underline-offset-2">
              your dashboard
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <PersonCard key={person.slug} person={person} />
          ))}
        </div>
      )}

      <p className="mt-16 text-sm text-muted-foreground max-w-xl">
        Listed here and changed your mind? Unpublishing from your dashboard removes the card
        immediately.
      </p>
    </PageShell>
  );
}

function PersonCard({ person }: { person: TalentCard }) {
  const name = person.displayName || "Jobak member";

  return (
    <article className="flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/6 border border-border-standard flex items-center justify-center text-base font-bold text-muted-foreground shrink-0">
          {name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug truncate">{name}</h2>
          {person.headline && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{person.headline}</p>
          )}
        </div>
      </div>

      {person.bio && (
        <p className="text-sm text-muted-foreground mt-4 line-clamp-3 leading-relaxed">{person.bio}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
        {person.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            {person.location}
          </span>
        )}
        {person.experienceYears !== null && person.experienceYears > 0 && (
          <span>{person.experienceYears} yrs</span>
        )}
        {person.seniority && <span className="capitalize">{person.seniority}</span>}
      </div>

      {person.openTo && person.openTo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {person.openTo.map((mode) => (
            <span
              key={mode}
              className="px-2 py-0.5 rounded-md text-[11px] border border-accent/20 bg-accent/8 text-accent-text"
            >
              {WORKPLACE_LABEL[mode] ?? mode}
            </span>
          ))}
        </div>
      )}

      {person.skills && person.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {person.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md text-[11px] border border-border-standard text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-5">
        {person.linkedinUrl && (
          <SocialLink href={person.linkedinUrl} label={`${name} on LinkedIn`} icon={LinkedInIcon} primary />
        )}
        {person.githubUrl && (
          <SocialLink href={person.githubUrl} label={`${name} on GitHub`} icon={GitHubIcon} />
        )}
        {person.websiteUrl && (
          <SocialLink href={person.websiteUrl} label={`${name}'s website`} icon={Globe} />
        )}
      </div>
    </article>
  );
}

function SocialLink({
  href,
  label,
  icon: Icon,
  primary,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      /*
       * `nofollow ugc` because these are user-supplied links on a public page.
       * Without it the directory becomes a place worth spamming for the SEO
       * value of the outbound link.
       */
      rel="noopener noreferrer nofollow ugc"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
        primary
          ? "border-accent/30 bg-accent/8 text-accent-text hover:bg-accent/15"
          : "border-border-standard text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
