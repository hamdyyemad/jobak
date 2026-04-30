"use client";
import { Briefcase, Sparkles, TrendingUp, Zap } from "lucide-react";

const stats = [
  { value: "50K+", label: "Jobs matched daily" },
  { value: "94%", label: "Match accuracy" },
  { value: "12x", label: "Faster job search" },
];

const features = [
  {
    icon: Zap,
    title: "AI-powered matching",
    desc: "Ranked by fit, not recency",
  },
  {
    icon: TrendingUp,
    title: "Multi-source scraping",
    desc: "LinkedIn, Indeed, RemoteOK & more",
  },
  {
    icon: Sparkles,
    title: "Personalized scoring",
    desc: "Tailored to your skills & preferences",
  },
];

export function AuthPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full min-h-screen overflow-hidden bg-bg-panel border-r border-border-subtle p-12">
      {/* Aurora blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full animate-aurora"
          style={{
            background:
              "radial-gradient(circle at center, oklch(0.82 0.20 145 / 0.18), transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[350px] h-[350px] rounded-full animate-aurora-reverse"
          style={{
            background:
              "radial-gradient(circle at center, oklch(0.82 0.20 145 / 0.10), transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--fg-primary) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center font-bold text-bg-canvas text-lg shrink-0">
          J
        </div>
        <span className="text-xl font-display tracking-tight text-fg-primary">
          Jobak
        </span>
      </div>

      {/* Center content */}
      <div className="relative z-10 space-y-10">
        {/* Headline */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent-text">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
            AI-powered job matching
          </div>
          <h2 className="text-4xl font-display leading-tight tracking-tight text-fg-primary">
            Find jobs that{" "}
            <span className="relative inline-block">
              actually fit
              <span className="absolute -bottom-1 left-0 right-0 h-2 bg-accent/25 -z-10 rounded" />
            </span>
          </h2>
          <p className="text-base text-fg-tertiary leading-relaxed max-w-xs">
            We scan thousands of listings across major platforms and rank them
            by how well they match your profile.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-accent-text" />
              </div>
              <div>
                <p className="text-sm font-medium text-fg-primary">{title}</p>
                <p className="text-xs text-fg-quaternary">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="p-4 rounded-xl bg-white/2 border border-border-standard space-y-1"
            >
              <p className="text-xl font-display text-fg-primary">{value}</p>
              <p className="text-[11px] text-fg-quaternary leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <div className="relative z-10 p-4 rounded-xl bg-white/2 border border-border-standard">
        <p className="text-sm text-fg-secondary leading-relaxed italic">
          &ldquo;Jobak found me three senior roles I would have missed — all
          scored above 90%.&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-accent-text" />
          </div>
          <div>
            <p className="text-xs font-medium text-fg-primary">Sarah K.</p>
            <p className="text-[11px] text-fg-quaternary">
              Senior Frontend Engineer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
