import {
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
  DashboardPreviewSection,
  FreeSection,
  CtaSection
} from "@/frontend/components/public";
import { isSignedIn } from "@/backend/lib/auth/session";

export default async function Home() {
  const authenticated = await isSignedIn();

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <HeroSection isAuthenticated={authenticated} />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <FreeSection isAuthenticated={authenticated} />
      <CtaSection isAuthenticated={authenticated} />
    </main>
  );
}
