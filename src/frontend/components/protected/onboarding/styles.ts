/**
 * Shared field styling for the onboarding steps.
 *
 * A rule rather than a box. The boxed inputs this replaced put a rounded,
 * bordered container around every answer, which is exactly what made the flow
 * read as a form template — neither reference site encloses anything. The real
 * declarations live in globals.css so the focus state can reference the live
 * scene tint.
 */
export const inputClass = "field-input";
export const triggerClass = "field-trigger";

/** Mono micro-label above a field. */
export const labelClass =
    "block mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fg-quaternary";
