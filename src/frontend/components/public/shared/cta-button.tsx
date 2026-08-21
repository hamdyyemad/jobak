import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { resolveCta } from "@/frontend/lib/configs/cta";

interface CtaButtonProps {
  isAuthenticated: boolean;
  /** Wording shown to signed-out visitors; signed-in visitors always get the dashboard. */
  signedOutText: string;
  className?: string;
  size?: "sm" | "lg" | "default";
}

/**
 * Auth-aware primary CTA. Deliberately has no "use client" directive so it can
 * render inside either a server or a client tree.
 */
export function CtaButton({
  isAuthenticated,
  signedOutText,
  className = "bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 rounded-full group font-medium",
  size = "lg",
}: CtaButtonProps) {
  const { text, href } = resolveCta(isAuthenticated, signedOutText);

  return (
    <Button size={size} className={className} asChild>
      <Link href={href}>
        {text}
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Link>
    </Button>
  );
}
