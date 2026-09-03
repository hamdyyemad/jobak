import { Check } from "lucide-react";
import { included } from "./data";

export function IncludedList() {
  return (
    <div>
      {included.map((item) => (
        <div
          key={item.title}
          className="flex items-start gap-4 py-5 border-b border-foreground/10 last:border-b-0"
        >
          <span className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3" />
          </span>
          <div>
            <h3 className="font-medium mb-1">{item.title}</h3>
            <p className="text-sm text-foreground/60 leading-relaxed">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
