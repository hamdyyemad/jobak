import { cn } from "@/frontend/lib/utils/utils";

/**
 * The dashboard's surfaces, in one place.
 *
 * Depth here comes from light rather than shadow: a faint top-down gradient
 * (`--surface-1`) over the near-black canvas, held by a hairline border that
 * brightens on hover. A flat fill on a #08090a ground reads as a patch of
 * slightly-less-black; a lit one reads as a card.
 *
 * `interactive` adds the 1px lift. It is opt-in because a lift on something you
 * cannot click is a lie about affordance.
 */
export function Card({
    className,
    interactive = false,
    selected = false,
    padding = "default",
    ...props
}: React.ComponentProps<"div"> & {
    interactive?: boolean;
    selected?: boolean;
    padding?: "none" | "compact" | "default";
}) {
    return (
        <div
            className={cn(
                "rounded-card border bg-(image:--surface-1) transition-[border-color,transform,background] duration-150",
                padding === "default" && "p-6",
                padding === "compact" && "p-5",
                selected ? "border-accent/40" : "border-border-subtle",
                interactive &&
                    "cursor-pointer hover:-translate-y-px hover:border-border-strong",
                className
            )}
            {...props}
        />
    );
}

/**
 * The mono micro-label.
 *
 * This is the "system talking" half of the type rule — section headings,
 * metadata, counts, table headers. Anything a person reads as *language* (page
 * titles, field labels, button text) uses sans sentence case instead.
 */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            className={cn(
                "font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary",
                className
            )}
            {...props}
        />
    );
}

/** A titled block within a page. The label is structural, so it is mono. */
export function Section({
    title,
    hint,
    children,
    className,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={className}>
            <Eyebrow>{title}</Eyebrow>
            {hint && <p className="mt-2 max-w-[62ch] text-[13px] text-fg-tertiary">{hint}</p>}
            <div className="mt-5">{children}</div>
        </section>
    );
}
