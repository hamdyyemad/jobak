import { AnimatedBackground } from "@/frontend/components/wrappers/animated-background";
import { StatsMarquee } from "./hero-stats";
import { 
  HeroEyebrow, 
  HeroHeadline, 
  HeroDescription, 
  HeroCTA 
} from "./hero-content";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      <AnimatedBackground enableGrid={false} enableSphere={true}>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-32 lg:py-40">
          <HeroEyebrow />
          <HeroHeadline />
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
            <HeroDescription />
            <HeroCTA />
          </div>
        </div>
        <div className="pt-16">
          <StatsMarquee />
        </div>
      </AnimatedBackground>
    </section>
  );
}