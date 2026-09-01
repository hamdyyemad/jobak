import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/frontend/lib/utils/utils";

interface PageHeaderProps {
    /** Mono breadcrumb above the title, e.g. `["Dashboard", "Documents"]`. */
    breadcrumb: string[];
    title: string;
    /** One line of orientation. Optional — not every page needs explaining. */
    description?: string;
    /** Where the back arrow goes. Omitted on top-level pages. */
    backHref?: string;
    backLabel?: string;
    /** Right-aligned actions, kept on the title's baseline. */
    actions?: React.ReactNode;
    className?: string;
}

/**
 * One header for every signed-in page.
 *
 * Settings used to hide its title inside a mono bar while Documents set its own
 * at 30px with no eyebrow, so the two pages did not look related at all. This
 * merges them: the mono breadcrumb keeps Settings' instrument-panel voice as an
 * *eyebrow*, and the display title comes from Documents, which is right that a
 * page should say what it is in language a person reads.
 *
 * The rule underneath fades to transparent rather than spanning the full width.
 * A hard full-width divider directly under a title reads as a table header.
 */
export function PageHeader({
    breadcrumb,
    title,
    description,
    backHref,
    backLabel = "Dashboard",
    actions,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn("mb-10", className)}>
            {backHref && (
                <Link
                    href={backHref}
                    className="mb-7 inline-flex items-center gap-2 text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {backLabel}
                </Link>
            )}

            <div className="flex items-end justify-between gap-6 flex-wrap">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
                        {breadcrumb.join(" / ")}
                    </p>
                    <h1 className="mt-2.5 font-display text-[26px] font-semibold tracking-[-0.03em] text-fg-primary">
                        {title}
                    </h1>
                </div>

                {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
            </div>

            {description && (
                <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-fg-tertiary">
                    {description}
                </p>
            )}

            <div className="mt-5 h-px bg-linear-to-r from-border-strong to-transparent" />
        </header>
    );
}
