"use client";

import { Minus, Plus } from "lucide-react";

interface NumberFieldProps {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    /** Names the stepper buttons for screen readers, e.g. "years of experience". */
    ariaLabel: string;
    /** Extra classes for the input itself, e.g. a mono face for money. */
    className?: string;
}

/**
 * A number input with a stepper we control.
 *
 * The native spinner is painted by the browser, not by CSS — on this dark canvas
 * it renders as a small light-grey box that belongs to no design system. Same
 * problem as the native <select> popup, and the same answer: suppress it (see
 * `.num-input` in globals.css) and draw the affordance ourselves.
 *
 * The input stays `type="number"`, so the numeric keypad on mobile and the
 * native ArrowUp/ArrowDown handling both still work — only the painted control
 * is replaced.
 */
export function NumberField({
    id,
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    placeholder,
    ariaLabel,
    className = "",
}: NumberFieldProps) {
    const clamp = (n: number) => {
        if (Number.isNaN(n)) return min;
        if (max !== undefined && n > max) return max;
        return n < min ? min : n;
    };

    const atMin = value <= min;
    const atMax = max !== undefined && value >= max;

    return (
        <div className="num-field">
            <input
                id={id}
                type="number"
                inputMode="numeric"
                value={value || ""}
                onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                aria-label={ariaLabel}
                className={`num-input ${className}`}
            />

            <button
                type="button"
                tabIndex={-1}
                disabled={atMin}
                onClick={() => onChange(clamp(value - step))}
                aria-label={`Decrease ${ariaLabel}`}
                className="num-step"
            >
                <Minus className="h-3 w-3" strokeWidth={2.5} />
            </button>
            <button
                type="button"
                /*
                 * Skipped in the tab order on purpose: the input itself already
                 * steps with ArrowUp/ArrowDown, so keyboard users gain nothing
                 * from two extra stops per field.
                 */
                tabIndex={-1}
                disabled={atMax}
                onClick={() => onChange(clamp(value + step))}
                aria-label={`Increase ${ariaLabel}`}
                className="num-step"
            >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
            </button>
        </div>
    );
}
