import Link from "next/link";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface JobakLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 11 — Horizon: sun rising over a horizon line */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f1011" stroke="rgba(255,255,255,0.10)" />
      {/* Sun arc — upper-right quarter circle */}
      <path d="M32 18 a14 14 0 0 1 14 14" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Sun disc */}
      <circle cx="32" cy="32" r="6" fill="var(--accent)" opacity="0.9" />
      {/* Horizon line — primary */}
      <path d="M10 42 H54" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Horizon line — secondary / reflection */}
      <path d="M14 48 H50" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function JobakLogo({ showText = true, size = "md", href = "/", className }: JobakLogoProps) {
  const textClass =
    size === "sm"
      ? "text-lg"
      : size === "lg"
      ? "text-3xl"
      : "text-xl";

  const content = (
    <span className={cn("flex items-center gap-2.5 group select-none", className)}>
      <LogoMark size={size} />
      {showText && (
        <span className={cn("font-display font-semibold tracking-tight text-(--fg-primary)", textClass)}>
          Jobak
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
      {content}
    </Link>
  );
}
