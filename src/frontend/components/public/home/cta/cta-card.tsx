"use client";
import { useIntersectionVisible } from "@/frontend/hooks";
import { GradientOrb } from "@/frontend/components/ui";
import { CtaContent } from "./cta-content";
import { CornerDecorations } from "./corner-decorations";

export function CtaCard() {
  const { ref, isVisible } = useIntersectionVisible<HTMLDivElement>({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`relative border border-foreground transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >

      <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
        {/* Gradient Orb - positioned absolutely to not take layout space */}
        <div className="absolute right-0 lg:right-8 top-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] pointer-events-none">
          <GradientOrb />
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <CtaContent />
        </div>
      </div>
      <CornerDecorations />
    </div>
  );
}

interface MouseSpotlightProps {
  x: number;
  y: number;
}

function MouseSpotlight({ x, y }: MouseSpotlightProps) {
  return (
    <div
      className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
      style={{
        background: `radial-gradient(600px circle at ${x}% ${y}%, rgba(0,0,0,0.15), transparent 40%)`,
      }}
    />
  );
}
