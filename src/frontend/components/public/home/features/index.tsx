import { features } from "./data";
import { SectionHeader } from "./section-header";
import { FeatureCard } from "./feature-card";

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <SectionHeader />
        <div>
          {features.map((feature, index) => (
            <FeatureCard key={feature.number} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
