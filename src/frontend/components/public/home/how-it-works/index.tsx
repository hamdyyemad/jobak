import { DiagonalPattern } from "@/frontend/components/wrappers/diagonal-pattern";
import { SectionHeader } from "./section-header";
import { InteractiveSteps } from "./interactive-steps";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden"
    >
      <DiagonalPattern>
        <div className="relative z-10 max-w-350 mx-auto px-6 lg:px-12">
          <SectionHeader />
          <InteractiveSteps />
        </div>
      </DiagonalPattern>
    </section>
  );
}
