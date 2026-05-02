import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

export function NavLogo({ isScrolled }: { isScrolled: boolean }) {
  return <JobakLogo size={isScrolled ? "sm" : "md"} showText />;
}