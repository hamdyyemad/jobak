import { CtaCard } from "./cta-card";

export function CtaSection({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <CtaCard isAuthenticated={isAuthenticated} />
      </div>
    </section>
  );
}
