import { ReactNode } from "react";

interface DiagonalPatternProps {
  opacity?: number;
  children: ReactNode;
}

export function DiagonalPattern({ opacity = 0.03, children }: DiagonalPatternProps) {
  return (
    <div className="relative">
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ opacity }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
