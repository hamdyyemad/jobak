"use client";
import { useIntersectionVisible } from "@/frontend/hooks";
import { Feature } from "./data";
import { AnimatedVisual } from "./visuals";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  const { ref, isVisible } = useIntersectionVisible<HTMLDivElement>({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 py-12 lg:py-20 border-b border-foreground/10">
        <FeatureNumber number={feature.number} />
        <div className="flex-1 grid lg:grid-cols-2 gap-8 items-center">
          <FeatureContent title={feature.title} description={feature.description} />
          <FeatureVisual type={feature.visual} />
        </div>
      </div>
    </div>
  );
}

function FeatureNumber({ number }: { number: string }) {
  return (
    <div className="shrink-0">
      <span className="font-mono text-sm text-muted-foreground">{number}</span>
    </div>
  );
}

interface FeatureContentProps {
  title: string;
  description: string;
}

function FeatureContent({ title, description }: FeatureContentProps) {
  return (
    <div>
      <h3 className="text-3xl lg:text-4xl font-display mb-4 group-hover:translate-x-2 transition-transform duration-500">
        {title}
      </h3>
      <p className="text-lg text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

interface FeatureVisualProps {
  type: Feature["visual"];
}

function FeatureVisual({ type }: FeatureVisualProps) {
  return (
    <div className="flex justify-center lg:justify-end">
      <div className="w-48 h-40 text-foreground">
        <AnimatedVisual type={type} />
      </div>
    </div>
  );
}
