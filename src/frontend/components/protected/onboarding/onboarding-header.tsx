import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

export function OnboardingHeader() {
  return (
    <header className="relative z-10 border-b border-border-subtle">
      {/*
        Mark only, centred. Not a link: onboarding has to be completed on first
        run, so the header carries no way out and no close button. Step position
        and progress live on the bottom rail, next to the controls that move
        between them.
      */}
      <nav className="mx-auto flex max-w-350 items-center justify-center px-8 py-5">
        <JobakLogo size="sm" showText href="" />
      </nav>
    </header>
  );
}
