import type { Metadata } from "next";
import { isSignedIn } from "@/backend/lib/auth/session";
import { CtaButton } from "@/frontend/components/public/shared/cta-button";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

export const metadata: Metadata = {
  title: "Features — Jobak",
  description:
    "AI relevance scoring, multi-platform coverage, filters that match how people actually search, and an encrypted API key.",
};

const features = [
  {
    number: "01",
    title: "AI-powered matching",
    body: "Every listing Jobak collects is scored from 0 to 100 against your profile before you ever see it. The score weighs your skills, years of experience, location and salary expectations — so the list opens with the closest fit rather than whatever was posted most recently.",
    points: [
      "A relevance score on every single match",
      "Ranked by fit, not by posting date",
      "Open a match to see why it scored the way it did",
    ],
  },
  {
    number: "02",
    title: "Multi-platform coverage",
    body: "Instead of running the same query across several job platforms yourself, you describe the role once and Jobak searches them for you. Listings that appear in more than one place are de-duplicated, so you read each opening once.",
    points: [
      "One profile drives every search",
      "Duplicate postings collapsed into one entry",
      "Re-run whenever you want — there is no quota or cooldown",
    ],
  },
  {
    number: "03",
    title: "Filters that match how you search",
    body: "The filters follow the way people actually narrow a job hunt: show only the strongest matches, only remote roles, only a particular contract type, or only the ones already bookmarked.",
    points: [
      "Top matches only, when you want the shortlist",
      "Remote, hybrid or on-site",
      "Full-time, part-time, freelance or contract",
      "Your bookmarks, kept separate",
    ],
  },
  {
    number: "04",
    title: "Secure and private by default",
    body: "Jobak runs on a Groq API key you supply. It is encrypted with AES-256-GCM before it reaches the database and is only ever used to rank matches on your behalf. Your preferences and matches are scoped to your account at the database level.",
    points: [
      "AES-256-GCM encryption on your API key",
      "Postgres row-level security scoping every row to your account",
      "Your preferences and matches are never sold or shared",
    ],
  },
];

export default async function FeaturesPage() {
  const authenticated = await isSignedIn();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Features"
        title={
          <>
            Everything you need.
            <br />
            <span className="text-muted-foreground">Nothing you don&apos;t.</span>
          </>
        }
        lead="Jobak does one job properly: find openings that fit you and put the best ones first. Here is what that involves."
      />

      <div className="mt-20 lg:mt-28 grid md:grid-cols-2 gap-x-16 gap-y-4 max-w-5xl">
        {features.map((feature) => (
          <div key={feature.number} className="py-8 border-b border-foreground/10">
            <span className="font-mono text-sm text-muted-foreground">{feature.number}</span>
            <h2 className="text-2xl lg:text-3xl font-display mt-3 mb-4">{feature.title}</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{feature.body}</p>
            <ul className="space-y-2.5">
              {feature.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <CtaButton isAuthenticated={authenticated} signedOutText="Get started" />
      </div>
    </PageShell>
  );
}
