import { 
  HeroSection, 
  HowItWorksSection, 
  FeaturesSection, 
  CtaSection 
} from "@/frontend/components/public";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CtaSection />
    </main>
  );
}
