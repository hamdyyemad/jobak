import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Navigation, FooterSection } from "@/frontend/components/public";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

export const metadata: Metadata = {
  title: "Page not found — Jobak",
  description: "The page you were looking for does not exist.",
};

/**
 * Root 404 for any unmatched route.
 *
 * This renders inside the root layout, not the (public) route group, so the
 * navigation and footer have to be included explicitly — otherwise the page
 * would arrive with no way to get anywhere.
 */

const destinations = [
  { name: "How it works", href: "/how-it-works", description: "The four stages, start to finish" },
  { name: "Features", href: "/features", description: "What Jobak actually does" },
  { name: "FAQ", href: "/faq", description: "Cost, keys, privacy, self-hosting" },
  { name: "About", href: "/about", description: "Why this exists" },
];

export default function NotFound() {
  return (
    <>
      <Navigation />
      <PageShell>
        <PageIntro
          eyebrow="404"
          title={
            <>
              This page doesn&apos;t exist.
              <br />
              <span className="text-muted-foreground">Let&apos;s get you back.</span>
            </>
          }
          lead="The link may be out of date, or the address might have a typo in it. Everything below is a real page."
        />

        <div className="mt-14">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 rounded-full group font-medium"
            asChild
          >
            <Link href="/">
              Back to home
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 lg:mt-24 max-w-3xl">
          <h2 className="text-sm font-mono text-muted-foreground mb-2">Or try one of these</h2>
          <ul>
            {destinations.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-baseline justify-between gap-6 py-5 border-b border-foreground/10 transition-colors hover:border-foreground/25"
                >
                  <span className="flex items-baseline gap-4 min-w-0">
                    <span className="text-lg lg:text-xl font-display transition-transform duration-300 group-hover:translate-x-1">
                      {item.name}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {item.description}
                    </span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PageShell>
      <FooterSection />
    </>
  );
}
