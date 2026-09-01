import { cn } from "@/frontend/lib/utils/utils";

interface StatProps {
    /** Mono micro-label. What the number is. */
    label: string;
    value: string | number;
    /** One line of context under the value — a delta, a qualifier. */
    caption?: string;
    /** 0–100. Renders an inline meter when the value is a proportion. */
    meter?: number;
    meterColor?: string;
    className?: string;
}

/**
 * The stat block, borrowed from `references/dashboards/ref-1`.
 *
 * The greeting banner used to render these as small pills — 16px value, 11px
 * label, side by side inside a `rounded-2xl` panel with two blurred glows
 * behind it. The numbers were the least prominent thing on a page whose entire
 * job is to report numbers.
 *
 * Inverted here: mono label above, value large and tabular, context below, and
 * an inline meter wherever the value is a proportion rather than a count. That
 * last part is the reference's real idea — encoding the value as length as well
 * as digits, so a good number reads before you finish scanning.
 */
export function Stat({
    label,
    value,
    caption,
    meter,
    meterColor,
    className,
}: StatProps) {
    return (
        <div
            className={cn(
                "min-w-[130px] flex-1 rounded-card border border-border-subtle bg-(image:--surface-1) p-4 transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong",
                className
            )}
        >
            <p className="font-mono text-[9.5px] uppercase tracking-[0.17em] text-fg-quaternary">
                {label}
            </p>

            <p className="mt-2.5 text-[27px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-fg-primary">
                {value}
            </p>

            {caption && <p className="mt-1.5 text-xs text-fg-tertiary">{caption}</p>}

            {typeof meter === "number" && (
                <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/8">
                    <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                            width: `${Math.max(0, Math.min(100, meter))}%`,
                            background: meterColor ?? "var(--accent)",
                        }}
                    />
                </div>
            )}
        </div>
    );
}
