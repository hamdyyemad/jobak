import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { ArrowRight } from "lucide-react";
import { resolveCta } from "@/frontend/lib/configs/cta";
import { ctaContent } from "./data";

export function CtaContent({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <div className="flex-1">
      <Heading />
      <Description />
      <ActionButtons isAuthenticated={isAuthenticated} />
      <Disclaimer isAuthenticated={isAuthenticated} />
    </div>
  );
}

function Heading() {
  return (
    <h2 className="text-4xl lg:text-7xl font-display tracking-tight mb-8 leading-[0.95]">
      {ctaContent.heading.line1}
      <br />
      {ctaContent.heading.line2}
    </h2>
  );
}

function Description() {
  return (
    <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
      {ctaContent.description}
    </p>
  );
}

function ActionButtons({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { text, href } = resolveCta(isAuthenticated, ctaContent.primaryButton.text);

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <Button
        size="lg"
        className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 text-base rounded-full group font-medium"
        asChild
      >
        <Link href={href}>
          {text}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
        asChild
      >
        <Link href={ctaContent.secondaryButton.href}>
          {ctaContent.secondaryButton.text}
        </Link>
      </Button>
    </div>
  );
}

/** Signup reassurance ("no credit card required") means nothing once you have an account. */
function Disclaimer({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) return null;

  return (
    <p className="text-sm text-muted-foreground mt-8 font-mono">
      {ctaContent.disclaimer}
    </p>
  );
}
