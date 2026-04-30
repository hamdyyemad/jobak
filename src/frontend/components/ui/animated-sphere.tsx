// src/frontend/components//public/home/animated-sphere.tsx
"use client";
import { useRef } from "react";
import { useSphereLogic, useCanvasSphere } from "@/frontend/hooks";

const CHARS = ".:+*#%@";

export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 1. Get the math brain
  const { getPoints } = useSphereLogic(CHARS);
  
  // 2. Attach the engine to the canvas
  useCanvasSphere(canvasRef, getPoints);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
}