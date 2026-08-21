"use client";

import type { ReactNode } from "react";

interface OptionRowProps {
    index: number;
    label: string;
    hint?: string;
    selected: boolean;
    onClick: () => void;
    /** Optional trailing content, e.g. a year range. */
    trailing?: ReactNode;
}

/**
 * One choice, drawn as a rule rather than a card.
 *
 * Cards were the first attempt and they are what made the flow read as a
 * template: three identical rounded boxes stacked in a column. Neither reference
 * puts a container around a choice — hertzwerk.ch lists its modes as bare
 * letter-spaced words. Here the row is just a hairline, a tabular index and a
 * marker; selecting it sweeps the scene tint across from the left.
 */
export function OptionRow({ index, label, hint, selected, onClick, trailing }: OptionRowProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            data-selected={selected}
            onClick={onClick}
            className="opt-row"
        >
            <span
                className={`opt-index font-mono text-[11px] tracking-[0.18em] ${
                    selected ? "text-(--fg-primary)" : "text-fg-quaternary"
                }`}
            >
                {String(index).padStart(2, "0")}
            </span>

            <span className="flex-1 min-w-0">
                <span
                    className={`block text-[15px] font-medium uppercase tracking-[0.13em] transition-colors duration-300 ${
                        selected ? "text-(--fg-primary)" : "text-fg-secondary"
                    }`}
                >
                    {label}
                </span>
                {hint && <span className="mt-1 block text-[13px] text-fg-quaternary normal-case">{hint}</span>}
            </span>

            {trailing && <span className="font-mono text-[11px] text-fg-quaternary">{trailing}</span>}

            <span aria-hidden="true" className="opt-marker shrink-0" />
        </button>
    );
}
