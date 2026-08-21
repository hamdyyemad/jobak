import { highlights } from "./data";

export function Highlights() {
  return (
    <div className="lg:sticky lg:top-32 self-start">
      {highlights.map((item) => (
        <div key={item.number} className="py-6 border-b border-foreground/10 last:border-b-0">
          <div className="flex items-start gap-5">
            <span className="font-mono text-sm text-muted-foreground pt-1">{item.number}</span>
            <div>
              <h3 className="text-xl lg:text-2xl font-display mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
