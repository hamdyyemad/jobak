import type { Metadata } from "next";
import { isSignedIn } from "@/backend/lib/auth/session";
import { CtaButton } from "@/frontend/components/public/shared/cta-button";

export const metadata: Metadata = {
  title: "About — Jobak",
  description:
    "What Jobak is, why it exists, and how it finds and ranks jobs for you across every major job board.",
};

export default async function AboutPage() {
  const authenticated = await isSignedIn();

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-350 mx-auto px-6 lg:px-12">
          <Intro />
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 mt-20 lg:mt-28">
            <div>
              {sections.map((section) => (
                <Block key={section.title} title={section.title}>
                  {section.body}
                </Block>
              ))}
            </div>
            <Aside isAuthenticated={authenticated} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Intro() {
  return (
    <div className="max-w-3xl">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
        <span className="w-8 h-px bg-foreground/30" />
        About
      </span>
      <h1 className="text-4xl lg:text-6xl font-display tracking-tight leading-[1.05] mb-8">
        Job boards are noisy.
        <br />
        <span className="text-muted-foreground">Jobak reads them for you.</span>
      </h1>
      <p className="text-xl text-muted-foreground leading-relaxed">
        Jobak is an AI-powered job matching platform. You describe what you are looking
        for once, and it searches job platforms on your behalf, then ranks what it finds
        so the closest fits are the first thing you read.
      </p>
    </div>
  );
}

const sections = [
  {
    title: "Why it exists",
    body: "Searching for a job means running the same query across half a dozen sites, re-reading listings that were never relevant, and losing the good ones in the noise. The work is repetitive and it is the kind of work software should be doing. Jobak automates the searching and the first pass of judgement, so the part left for you is deciding which of the strong matches to actually apply to.",
  },
  {
    title: "How it works",
    body: "Onboarding asks six questions: remote or on-site, where you are, your field and skills, the type of role, your seniority, and a salary range. That profile drives an n8n workflow which searches job platforms for openings that fit. Every listing that comes back is scored from 0 to 100 by a Groq model against your profile, and the results land on your dashboard sorted by that score.",
  },
  {
    title: "What it costs",
    body: "Nothing. There is no plan to choose, no trial that expires and no card to enter. You connect your own Groq API key during onboarding and it does the ranking on your behalf — the key is encrypted with AES-256-GCM before it is stored and is never shared with third parties.",
  },
  {
    title: "Open source",
    body: "Jobak is MIT licensed and the source is public. You can read exactly how the scoring works, run your own instance, or change the ranking to suit yourself. Nothing about the matching is a black box.",
  },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-8 border-b border-foreground/10 first:pt-0 last:border-b-0">
      <h2 className="text-2xl lg:text-3xl font-display mb-4">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Aside({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="lg:sticky lg:top-32 self-start">
      <div className="rounded-2xl border border-border-standard bg-white/2 p-8">
        <h2 className="text-sm font-mono text-muted-foreground mb-6">At a glance</h2>
        <dl className="space-y-5">
          <Fact term="Where jobs come from">
            Job platforms, searched automatically on your behalf
          </Fact>
          <Fact term="Ranking">Groq model, 0–100 relevance score per listing</Fact>
          <Fact term="Price">Free — you bring your own Groq API key</Fact>
          <Fact term="Licence">MIT</Fact>
          <Fact term="Built by">Hamdy Emad</Fact>
        </dl>

        <div className="mt-8 pt-8 border-t border-border-subtle">
          <CtaButton
            isAuthenticated={isAuthenticated}
            signedOutText="Get started"
            size="default"
            className="bg-accent hover:bg-accent-bright text-(--bg-canvas) rounded-full h-12 px-6 group font-medium w-full"
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-mono text-muted-foreground mb-1">{term}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  );
}
