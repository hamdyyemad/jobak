import { cn } from "@/frontend/lib/utils/utils";

/**
 * Form fields, boxed.
 *
 * Two systems were in play: underlined rules in onboarding and Settings, boxed
 * inputs in Documents and Profile — and Profile used both on the same screen.
 * The box wins for forms because it survives the dense two-column layouts those
 * pages actually use, which a bare underline does not.
 *
 * The editorial underline is *not* deleted. It stays in onboarding, where the
 * full-bleed scene is the whole point and every field sits alone on the canvas.
 */
export const inputClass =
    "w-full h-9.5 rounded-control border border-border-standard bg-white/2.5 px-3 text-sm text-fg-primary placeholder:text-fg-quaternary transition-[border-color,background] focus:border-accent/45 focus:bg-white/4 focus:outline-none";

export const textareaClass =
    "w-full rounded-control border border-border-standard bg-white/2.5 px-3 py-2.5 text-sm leading-relaxed text-fg-primary placeholder:text-fg-quaternary transition-[border-color,background] focus:border-accent/45 focus:bg-white/4 focus:outline-none resize-y";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
    return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return <textarea className={cn(textareaClass, className)} {...props} />;
}

/**
 * Label + optional hint + control.
 *
 * The label is sans sentence case, not mono caps: it is language a person
 * reads, and mono caps on every input across a settings page is shouting.
 */
export function Field({
    label,
    hint,
    htmlFor,
    children,
    className,
}: {
    label: string;
    hint?: string;
    htmlFor?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <label
                htmlFor={htmlFor}
                className="block text-[13px] font-medium text-fg-primary"
            >
                {label}
            </label>
            {hint && <p className="mt-1 text-xs text-fg-quaternary">{hint}</p>}
            <div className="mt-2">{children}</div>
        </div>
    );
}
