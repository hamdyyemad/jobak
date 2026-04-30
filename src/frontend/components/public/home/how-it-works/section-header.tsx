"use client";
import { useIntersectionVisible } from "@/frontend/hooks";

export function SectionHeader() {
  const { ref, isVisible } = useIntersectionVisible<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div ref={ref} className="mb-16 lg:mb-24">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-background/50 mb-6">
        <span className="w-8 h-px bg-background/30" />
        Process
      </span>
      <h2
        className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        Three steps.
        <br />
        <span className="text-background/50">Your dream job.</span>
      </h2>
    </div>
  );
}
