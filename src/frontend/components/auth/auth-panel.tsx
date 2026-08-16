import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { AuthCarousel } from "./auth-carousel";

/**
 * Brand side of the auth split. Server-rendered apart from the carousel island.
 *
 * The ambient fields are plain radial gradients animated on transform only.
 * They deliberately avoid `filter: blur()` — a blurred 500px box has to be
 * re-rasterised through the filter pipeline on every animation frame, which is
 * exactly the cost this project has been stripping out elsewhere.
 */
export function AuthPanel() {
  return (
    <aside className="relative hidden lg:flex flex-col h-full min-h-dvh overflow-hidden bg-bg-panel border-r border-border-subtle p-12">
      <AmbientField />

      <div className="relative z-10 panel-enter">
        <JobakLogo size="md" showText />
      </div>

      {/* Headline and carousel travel together as one centred block rather than
          being pushed to opposite ends of the panel. */}
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-16 max-w-md">
        <div>
          <h2
            className="text-4xl xl:text-5xl font-display leading-[1.08] tracking-tight text-fg-primary panel-enter"
            style={{ animationDelay: "90ms" }}
          >
            Find jobs that{" "}
            <span className="relative inline-block">
              actually fit
              <span className="absolute -bottom-1 left-0 right-0 h-2 bg-accent/25 -z-10 rounded" />
            </span>
          </h2>
          <p
            className="mt-6 text-base text-fg-tertiary leading-relaxed panel-enter"
            style={{ animationDelay: "180ms" }}
          >
            Describe the role once. We search job platforms on your behalf and rank
            what we find by how well it matches your profile.
          </p>
        </div>

        <div className="panel-enter" style={{ animationDelay: "280ms" }}>
          <AuthCarousel />
        </div>
      </div>
    </aside>
  );
}

function AmbientField() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div
        className="absolute -top-40 -right-40 w-130 h-130 rounded-full animate-drift"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 22%, transparent), transparent 72%)",
        }}
      />
      <div
        className="absolute -bottom-32 -left-28 w-105 h-105 rounded-full animate-drift-slow"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--fg-primary) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
