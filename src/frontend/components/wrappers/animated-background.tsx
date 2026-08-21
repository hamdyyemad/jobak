import { ReactNode } from "react";
import { AnimatedSphere } from "@/frontend/components/ui";

export function AnimatedBackground({
  enableSphere = true,
  enableGrid = true,
  children,
}: {
  enableSphere?: boolean;
  enableGrid?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Decorative sphere */}
      {enableSphere && (
        <div className="absolute right-0 top-[20%] -translate-y-1/2 w-150 h-150 lg:w-200 lg:h-200 opacity-40 pointer-events-none z-0">
          <AnimatedSphere />
        </div>
      )}

      {enableGrid && <ParallaxGrid />}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ParallaxGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 scale-105">
      <HorizontalGridLines />
      <VerticalGridLines />
    </div>
  );
}

function HorizontalGridLines() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute h-px w-full bg-foreground/30"
          style={{ top: `${12.5 * (i + 1)}%` }}
        />
      ))}
    </>
  );
}

function VerticalGridLines() {
  return (
    <>
      {[...Array(12)].map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute w-px h-full bg-foreground/30"
          style={{ left: `${8.33 * (i + 1)}%` }}
        />
      ))}
    </>
  );
}
