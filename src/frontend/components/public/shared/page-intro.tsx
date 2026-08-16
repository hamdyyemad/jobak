import { ReactNode } from "react";

interface PageIntroProps {
  eyebrow: string;
  title: ReactNode;
  lead: string;
}

/** Shared header for the standalone public detail pages. */
export function PageIntro({ eyebrow, title, lead }: PageIntroProps) {
  return (
    <div className="max-w-3xl">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
        <span className="w-8 h-px bg-foreground/30" />
        {eyebrow}
      </span>
      <h1 className="text-4xl lg:text-6xl font-display tracking-tight leading-[1.05] mb-8">
        {title}
      </h1>
      <p className="text-xl text-muted-foreground leading-relaxed">{lead}</p>
    </div>
  );
}

/** Standard page wrapper so every detail page shares spacing and the noise overlay. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-350 mx-auto px-6 lg:px-12">{children}</div>
      </section>
    </main>
  );
}
