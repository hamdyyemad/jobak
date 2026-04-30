"use client";
import { Button } from "@/frontend/components/ui/button";
import { ArrowRight } from "lucide-react";
import { roles } from "@/frontend/components//public/home/hero/data";
import { useCycleIndex } from "@/frontend/hooks";

export function HeroEyebrow() {
  return (
    <div className="mb-8 opacity-100 translate-y-0 transition-all duration-700">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
        <span className="w-8 h-px bg-foreground/30" />
        AI-powered job matching
      </span>
    </div>
  );
}

export function HeroHeadline() {
  const roleIndex = useCycleIndex(roles.length, 2500);
  return (
    <div className="mb-12">
      <h1 className="text-[clamp(3rem,12vw,10rem)] font-display leading-[0.9] tracking-tight">
        <span className="block">Jobs for</span>
        <span className="block">
          top{" "}
          <span className="relative inline-block">
            <span key={roleIndex} className="inline-flex">
              {roles[roleIndex].split("").map((char, i) => (
                <span
                  key={`${roleIndex}-${i}`}
                  className="inline-block animate-char-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
            <span className="absolute -bottom-2 left-0 right-0 h-3 bg-accent/20 -z-10" />
          </span>
        </span>
      </h1>
    </div>
  );
}

export function HeroDescription() {
  return (
    <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl transition-all duration-700 delay-200">
      Tell us your skills and preferences. Our AI scrapes LinkedIn, Indeed, RemoteOK and more — then ranks every match just for you.
    </p>
  );
}

export function HeroCTA() {
  return (
    <div className="flex flex-row items-start gap-4 transition-all duration-700 delay-300">
      <Button size="lg" className="bg-accent hover:bg-accent-bright text-background px-8 h-14 rounded-full group" asChild>
        <a href="/onboarding">
          Find my jobs
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </a>
      </Button>
      <Button size="lg" variant="outline" className="h-14 px-8 rounded-full border-foreground/20">
        <a href="#how-it-works">See how it works</a>
      </Button>
    </div>
  );
}