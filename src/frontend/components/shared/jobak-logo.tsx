import Link from "next/link";
import { cn } from "@/frontend/lib/utils/utils";

interface JobakLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

/**
 * The Jobak mark — "Horizon J".
 *
 * The previous mark was a rounded-square badge containing a sun disc, a quarter
 * arc and two horizon rules: five elements, four of them hairlines. It smudged
 * into a single blob below about 24px (the sidebar renders it at 28, a favicon
 * at 16) and the dark badge fill made it vanish on any light ground.
 *
 * This keeps the idea exactly — a sun clearing a horizon, career growth — and
 * re-cuts it as a J, which is what every reference in `references/logos` does:
 * flat, one colour, geometric, a detached tittle, no container. The J's bowl
 * *is* the horizon and the disc is the sun above it. One stroke weight, one
 * curve, two elements.
 *
 * It draws in `currentColor`, so the same component works in accent on the
 * marketing site, in white on the sidebar, and in black on a light background —
 * the last of which the old mark could not do at all.
 */
function LogoMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      {/* The horizon: the J's bowl, drawn as a single unbroken stroke. */}
      <path
        d="M45 14 V36 A13 13 0 0 1 19 36"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* The sun, detached — the tittle every reference monogram carries. */}
      <circle cx="23" cy="18" r="5.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The tile lock-up, for app icons and avatars.
 *
 * Concept D from the design direction: the J knocked out of a solid tile as
 * negative space. It is the one variant that keeps a container, which is
 * correct here and wrong everywhere else — an app icon is *always* composited
 * onto someone else's background, so it needs to supply its own.
 */
export function JobakTile({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <mask id="jobak-tile-mask">
        <rect x="5" y="5" width="54" height="54" rx="17" fill="#fff" />
        <path
          fill="#000"
          d="M36 16 H44 V34 A14 14 0 0 1 16 34 H24 A6 6 0 0 0 36 34 Z"
        />
        <circle cx="24" cy="20" r="4.4" fill="#000" />
      </mask>
      <rect
        x="5"
        y="5"
        width="54"
        height="54"
        rx="17"
        fill="currentColor"
        mask="url(#jobak-tile-mask)"
      />
    </svg>
  );
}

export function JobakLogo({ showText = true, size = "md", href = "/", className }: JobakLogoProps) {
  const textClass = size === "sm" ? "text-[17px]" : size === "lg" ? "text-[28px]" : "text-xl";

  const content = (
    <span className={cn("group flex select-none items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showText && (
        <span
          className={cn(
            /*
             * -0.035em rather than Tailwind's `tracking-tight`. The tighter set
             * is what makes a wordmark read as drawn rather than typed, and at
             * five characters there is no legibility cost.
             */
            "font-display font-semibold tracking-[-0.035em] text-fg-primary",
            textClass
          )}
        >
          Jobak
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {content}
    </Link>
  );
}
