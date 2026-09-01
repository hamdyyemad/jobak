import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Bug, Share2, UserRoundCheck } from "lucide-react";
import { GitHubIcon } from "@/frontend/components/shared/brand-icons";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { WalletList } from "@/frontend/components/public/support/wallet-list";
import { supportWallets } from "@/frontend/components/public/shared/footer/data";

const TITLE = "Buy me a coffee";
const DESCRIPTION =
  "Jobak is free and stays free. If it helped you find something, here is how to help back — most of it costs nothing.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  alternates: { canonical: "/support" },
  openGraph: {
    type: "website",
    title: `${TITLE} — Jobak`,
    description: DESCRIPTION,
    url: "/support",
    siteName: "Jobak",
  },
};

const REPO = "https://github.com/hamdyyemad/jobak";

/**
 * The support page.
 *
 * Built so it is a complete page **before** any wallet exists. The crypto
 * section renders only when `supportWallets` has real entries — that list is
 * deliberately empty in the repo, because a placeholder address that ships is
 * money sent nowhere, and nobody notices until someone tries it.
 *
 * The free ways to help are listed first and are not filler. For a project with
 * no marketing budget, a star and a share are worth more than a tip, and saying
 * so is more honest than leading with a donation ask.
 */
export default function SupportPage() {
  const hasWallets = supportWallets.length > 0;

  return (
    <PageShell>
      <PageIntro
        eyebrow="Support"
        title={
          <>
            It is free.
            <br />
            <span className="text-muted-foreground">Help how you like.</span>
          </>
        }
        lead="There is no plan to upgrade to and nothing held back. The only cost is whatever your own AI provider charges for the key you connect, and that goes to them, not to us."
      />

      {/* ── Free ─────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
          Costs nothing
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Way
            icon={GitHubIcon}
            title="Star the repository"
            body="It is how anyone finds an open-source project. Thirty seconds, and it is the single most useful thing on this page."
            href={REPO}
            cta="Open on GitHub"
          />
          <Way
            icon={Bug}
            title="Report what is broken"
            body="Jobak reads a dozen sources that change without warning. One report about a wrong listing is worth more than a hundred silent closes."
            href="/feedback"
            cta="Send feedback"
            internal
          />
          <Way
            icon={Share2}
            title="Send it to someone job-hunting"
            body="Especially in Egypt, Saudi or the UAE — that is who this was built for, and word of mouth is the whole distribution strategy."
          />
          <Way
            icon={UserRoundCheck}
            title="Publish your profile"
            body="An opt-in directory only works once it has people in it. Yours makes it useful for the next person."
            href="/talent"
            cta="See the directory"
            internal
          />
        </div>
      </section>

      {/* ── Money ────────────────────────────────────────── */}
      <section className="mt-16 max-w-2xl">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
          Costs money
        </h2>

        {hasWallets ? (
          <>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              If Jobak helped you land something, a tip keeps the collectors running. Entirely
              optional — nothing on the site is gated behind it.
            </p>

            {/*
              The network warning sits above the addresses, not below. Someone
              scanning for the address to copy will not read a note underneath
              it, and this is the mistake that actually destroys funds.
            */}
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-(--status-amber)/30 bg-(--status-amber)/6 p-4">
              <AlertTriangle className="w-4 h-4 text-(--status-amber) shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Match the network exactly.</strong> USDT on
                TRC-20, ERC-20 and BEP-20 are different chains that happen to share a name. Sending
                to the wrong one destroys the funds, and nobody can recover them — not us, not the
                exchange. Copy the address rather than typing it.
              </p>
            </div>

            <div className="mt-4">
              <WalletList wallets={supportWallets} />
            </div>
          </>
        ) : (
          /*
           * No wallets configured, so no addresses are shown. The alternative —
           * a placeholder or an example address — is how a tip page quietly
           * sends someone's money to a stranger.
           */
          <p className="mt-6 text-muted-foreground leading-relaxed">
            No tip addresses are set up yet. When there are, they will appear here — until then the
            free options above are genuinely the more useful ones anyway.
          </p>
        )}
      </section>

      <p className="mt-16 max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Jobak is MIT licensed, so you can also read exactly how the matching works, change it, or
        run your own copy on your own infrastructure.{" "}
        <Link href="/faq" className="text-accent underline underline-offset-2">
          More in the FAQ
        </Link>
        .
      </p>
    </PageShell>
  );
}

function Way({
  icon: Icon,
  title,
  body,
  href,
  cta,
  internal,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  href?: string;
  cta?: string;
  internal?: boolean;
}) {
  return (
    <div className="flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2">
      <Icon className="w-4 h-4 text-accent shrink-0" />
      <h3 className="mt-3 text-base font-semibold leading-snug">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>

      {href && cta && (
        <div className="mt-auto pt-4">
          {internal ? (
            <Link href={href} className="text-sm text-accent underline underline-offset-2">
              {cta}
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
            >
              {cta}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
