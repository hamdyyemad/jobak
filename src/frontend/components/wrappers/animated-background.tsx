"use client";
import { ReactNode } from "react";
import { AnimatedSphere } from "@/frontend/components/ui";
import { useMousePosition } from "@/frontend/hooks";

export function AnimatedBackground({ enableSphere = true, enableGrid = true, children }: { enableSphere?: boolean; enableGrid?: boolean; children: ReactNode }) {
  // const mouse = useMousePosition();

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Animated sphere with slight mouse lag */}
      <div 
        className="absolute right-0 w-150 h-150 lg:w-200 lg:h-200 opacity-40 pointer-events-none z-0 transition-transform duration-1000 ease-out"
        style={{
          top: '20%',
        //  transform: `translate(${mouse.x * -50}px, calc(-50% + ${mouse.y * -50}px))`
         transform: `translate(0, -50%)`
        }}
      >
        {enableSphere && <AnimatedSphere />}
      </div>

      {/* Grid lines with parallax */}
      {enableGrid && <ParallaxGrid mouseX={0} mouseY={0} /> }

      <div className="relative z-10">{children}</div>
    </div>
  );
}
function ParallaxGrid({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <div 
      className="absolute inset-0 pointer-events-none z-0 transition-transform duration-700 ease-out"
      style={{
        transform: `scale(1.05) translate(${mouseX * 20}px, ${mouseY * 20}px)`
      }}
    >
      <div className="absolute inset-0">
        <HorizontalGridLines />
        <VerticalGridLines />
      </div>
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