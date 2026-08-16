import type { Metadata } from "next";
import { isSignedIn } from "@/backend/lib/auth/session";
import { CtaButton } from "@/frontend/components/public/shared/cta-button";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

export const metadata: Metadata = {
  title: "FAQ — Jobak",
  description:
    "Is Jobak free, why does it need your own Groq API key, where do the jobs come from, and who can see your data.",
};

const faqs = [
  {
    q: "Is Jobak really free?",
    a: "Yes. There is no plan to choose, no trial that expires and no card to enter. Nothing is held back behind an upgrade. The only cost involved is whatever your own AI provider charges you for the key you connect.",
  },
  {
    q: "Why do I need my own Groq API key?",
    a: "The ranking step runs a model over every listing it collects, and that costs money per request. Rather than charge you a subscription to cover it, Jobak runs on a key you supply, so you are billed directly by your provider at cost and never marked up. You can create a key for free at console.groq.com/keys.",
  },
  {
    q: "What happens to my API key?",
    a: "It is encrypted with AES-256-GCM before it is written to the database, and it is decrypted only when a search runs on your behalf. It is never shared with third parties and never used for anyone else's searches.",
  },
  {
    q: "Where do the jobs come from?",
    a: "Jobak searches job platforms for openings that match the profile you set during onboarding, and collects what it finds. Listings that turn up in more than one place are de-duplicated so you only read each opening once.",
  },
  {
    q: "How often can I run a search?",
    a: "As often as you like. There is no quota and no cooldown — re-run it whenever you want a fresh set of matches. Bear in mind each run uses your own API key for the ranking step.",
  },
  {
    q: "What does the score actually mean?",
    a: "Every listing is scored from 0 to 100 for how well it matches your profile — your skills, experience, location and salary range. It is a relevance score, not a quality judgement about the company, and it is what the list is sorted by.",
  },
  {
    q: "Who can see my preferences and matches?",
    a: "Only you. Every row is scoped to your account by Postgres row-level security, so the database itself enforces that one account cannot read another's preferences or matches. Your data is not sold or shared.",
  },
  {
    q: "Can I run my own copy?",
    a: "Yes — Jobak is MIT licensed and the source is public. You can read exactly how the scoring works, change the ranking, or host your own instance on your own infrastructure.",
  },
];

export default async function FaqPage() {
  const authenticated = await isSignedIn();

  return (
    <PageShell>
      <PageIntro
        eyebrow="FAQ"
        title={
          <>
            Questions,
            <br />
            <span className="text-muted-foreground">answered plainly.</span>
          </>
        }
        lead="What Jobak costs, what it does with your data, and where the jobs come from."
      />

      <div className="mt-20 lg:mt-28 max-w-3xl">
        {faqs.map((faq) => (
          <div key={faq.q} className="py-8 border-b border-foreground/10 last:border-b-0">
            <h2 className="text-xl lg:text-2xl font-display mb-3">{faq.q}</h2>
            <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <CtaButton isAuthenticated={authenticated} signedOutText="Get started" />
      </div>
    </PageShell>
  );
}
