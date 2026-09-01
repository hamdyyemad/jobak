import { cn } from "@/frontend/lib/utils/utils";

/**
 * A neutral chip that carries its identity as a dot.
 *
 * The job list used to render source labels as fourteen hardcoded Tailwind
 * colour pairs — a filled blue pill for LinkedIn, purple for Indeed, and so on.
 * Two problems: it made the list very loud for information that is secondary to
 * the match itself, and a collector added later either needed a fifteenth
 * hardcoded hue or fell back to grey, so the set could never stay coherent.
 *
 * Here the hue still identifies the source, but it is 5px of it. Everything
 * else is the same neutral chip, so a new source looks native on day one.
 */
export function Chip({
    dot,
    className,
    children,
    ...props
}: React.ComponentProps<"span"> & { dot?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-chip border border-border-standard bg-white/2.5 px-2 py-0.5 text-[11.5px] text-fg-secondary",
                className
            )}
            {...props}
        >
            {dot && (
                <i
                    aria-hidden="true"
                    className="size-[5px] shrink-0 rounded-full"
                    style={{ background: dot }}
                />
            )}
            {children}
        </span>
    );
}

/**
 * A filter toggle.
 *
 * Fully round survives here and nowhere else in the system: roundness is what
 * signals "this is a toggle, not a label", which is exactly the distinction the
 * old design lost by making source labels round too.
 */
export function FilterChip({
    selected,
    className,
    ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium capitalize transition-all",
                selected
                    ? "border-accent bg-accent text-(--bg-canvas)"
                    : "border-border-standard bg-white/2 text-fg-tertiary hover:border-border-strong hover:text-fg-primary",
                className
            )}
            {...props}
        />
    );
}
