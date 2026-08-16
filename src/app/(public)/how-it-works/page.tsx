import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

export const metadata: Metadata = {
  title: "How it works — Jobak",
  description:
    "From the six onboarding questions to a ranked list of matches: what Jobak does at each stage, and what it does with your data.",
};

const stages = [
  {
    number: "01",
    title: "You describe what you want",
    body: "Onboarding is six short steps. You pick remote, on-site or hybrid; give your country and city; choose your field and list your skills; set the job types you will consider and your seniority and years of experience; give a salary range in USD, EUR, GBP or EGP; and finally connect a Groq API key.",
    detail: [
      "Work preference — remote, on-site or hybrid",
      "Location — country, and city where it matters",
      "Field and skills — what you do and what you know",
      "Job type and seniority — full-time, part-time, freelance or contract; entry through lead",
      "Salary range — with the currency you actually think in",
      "Your Groq API key — encrypted before it is stored",
    ],
  },
  {
    number: "02",
    title: "The search runs",
    body: "Your saved profile is handed to an n8n workflow, which searches job platforms for openings that fit and collects what it finds. Duplicates are dropped so the same role posted in two places does not show up twice.",
    detail: [
      "Triggered from your dashboard, not on a fixed schedule",
      "Runs against the profile you saved during onboarding",
      "Collected listings are stored against your account only",
    ],
  },
  {
    number: "03",
    title: "AI scores every listing",
    body: "Each collected listing is passed to a Groq model together with your profile, and comes back with a relevance score from 0 to 100. That score is what decides the order you see things in — not how recently something was posted.",
    detail: [
      "Scored against your skills, experience, location and salary range",
      "Ranked by fit rather than recency",
      "Runs on the API key you supplied, never a shared one",
    ],
  },
  {
    number: "04",
    title: "You review the matches",
    body: "Results land on your dashboard sorted by score. Open any match to read the full description and why it scored the way it did, bookmark the ones worth keeping, and follow the original posting to apply.",
    detail: [
      "Sorted by relevance score by default",
      "Filter down to the subset worth your time",
      "Bookmark matches to come back to them",
      "Re-run the search whenever you want — there is no quota",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="How it works"
        title={
          <>
            Four stages.
            <br />
            <span className="text-muted-foreground">One ranked list.</span>
          </>
        }
        lead="You answer six questions once. After that, the searching and the first pass of judgement happen without you — so what is left is deciding which of the strong matches to actually apply to."
      />

      <div className="mt-20 lg:mt-28 max-w-4xl">
        {stages.map((stage) => (
          <div key={stage.number} className="py-10 border-b border-foreground/10 last:border-b-0">
            <div className="flex items-start gap-6 lg:gap-10">
              <span className="font-mono text-sm text-muted-foreground pt-2 shrink-0">
                {stage.number}
              </span>
              <div>
                <h2 className="text-2xl lg:text-3xl font-display mb-4">{stage.title}</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{stage.body}</p>
                <ul className="space-y-2.5">
                  {stage.detail.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <Button
          size="lg"
          className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 rounded-full group font-medium"
          asChild
        >
          <Link href="/register">
            Get started
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
