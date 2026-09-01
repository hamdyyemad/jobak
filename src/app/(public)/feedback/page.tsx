import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { FeedbackForm } from "@/frontend/components/public/feedback/feedback-form";

const TITLE = "Feedback";
const DESCRIPTION =
  "Tell us what is broken, what is missing, or which listing is wrong. No account needed, and no email required unless you want a reply.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  alternates: { canonical: "/feedback" },
  openGraph: {
    type: "website",
    title: `${TITLE} — Jobak`,
    description: DESCRIPTION,
    url: "/feedback",
    siteName: "Jobak",
  },
};

/**
 * The feedback page.
 *
 * Public, and it takes anonymous submissions. That is deliberate: the people
 * best placed to say a listing is wrong or a page is broken are often the ones
 * who gave up before making an account, and a form behind a login never hears
 * from them.
 *
 * It also stands in for the contact page that PRE_PRODUCTION has been waiting on
 * a `support@` mailbox for. This needs no mailbox — submissions land in the
 * `feedback` table, readable only by the service role.
 */
export default function FeedbackPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Feedback"
        title={
          <>
            Tell us what is
            <br />
            <span className="text-muted-foreground">wrong with it.</span>
          </>
        }
        lead="Jobak collects from a dozen sources that change without warning, so things break. Reporting one broken listing is worth more than a hundred people quietly closing the tab."
      />

      <FeedbackForm />

      <div className="mt-16 max-w-xl space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">Found a bug in the code?</strong> Jobak is MIT
          licensed and the source is public — an issue or a pull request is welcome, and gets to
          the problem faster than this form does.
        </p>
        <p>
          <strong className="text-foreground">Want to support it instead?</strong> It is free and
          stays free.{" "}
          <Link href="/support" className="text-accent underline underline-offset-2">
            There are a few ways to help
          </Link>
          , none of which cost money.
        </p>
      </div>
    </PageShell>
  );
}
