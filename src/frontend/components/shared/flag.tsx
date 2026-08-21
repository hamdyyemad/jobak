import { flagUrl } from "@/frontend/lib/configs/countries";

interface FlagProps {
    /** ISO 3166-1 alpha-2. */
    code: string;
    className?: string;
}

/**
 * Flags are served from `public/flags` as plain <img>, not next/image: they are
 * already minimal SVGs, so there is nothing for the optimizer to do, and being
 * same-origin is what lets the orb sample their colours from a canvas.
 *
 * Emoji flags (🇪🇬) were the obvious first choice and do not work — Windows
 * ships no flag emoji font, so every one of them renders as bare letters.
 */
export function Flag({ code, className = "" }: FlagProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={flagUrl(code)}
            alt=""
            aria-hidden="true"
            width={21}
            height={14}
            loading="lazy"
            /*
             * No border or ring: these load lazily, and any decoration would draw
             * an empty box for every flag still below the fold in the open list.
             */
            className={`shrink-0 object-cover ${className}`}
        />
    );
}
