import { Button } from "@/frontend/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ctaContent } from "./data";

export function CtaContent() {
  return (
    <div className="flex-1">
      <Heading />
      <Description />
      <ActionButtons />
      <Disclaimer />
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

function ActionButtons() {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <Button
        size="lg"
        className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 text-base rounded-full group font-medium"
        asChild
      >
        <a href={ctaContent.primaryButton.href}>
          {ctaContent.primaryButton.text}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </a>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
        asChild
      >
        <a href={ctaContent.secondaryButton.href}>
          {ctaContent.secondaryButton.text}
        </a>
      </Button>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-sm text-muted-foreground mt-8 font-mono">
      {ctaContent.disclaimer}
    </p>
  );
}
