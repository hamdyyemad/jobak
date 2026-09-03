import { DiagonalPattern } from "@/frontend/components/wrappers/diagonal-pattern";
import { SectionHeader } from "./section-header";
import { ApiKeyNote } from "./api-key-note";
import { IncludedList } from "./included-list";

export function FreeSection({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <section
      id="cost"
      className="relative py-24 lg:py-32 bg-background text-foreground overflow-hidden"
    >
      <DiagonalPattern>
        <div className="relative z-10 max-w-350 mx-auto px-6 lg:px-12">
          <SectionHeader />
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
            <ApiKeyNote isAuthenticated={isAuthenticated} />
            <IncludedList />
          </div>
        </div>
      </DiagonalPattern>
    </section>
  );
}
