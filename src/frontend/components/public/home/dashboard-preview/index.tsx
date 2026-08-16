import { SectionHeader } from "./section-header";
import { Highlights } from "./highlights";
import { PreviewPanel } from "./preview-panel";

export function DashboardPreviewSection() {
  return (
    <section id="dashboard" className="relative py-24 lg:py-32">
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <SectionHeader />
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          <Highlights />
          <PreviewPanel />
        </div>
      </div>
    </section>
  );
}
