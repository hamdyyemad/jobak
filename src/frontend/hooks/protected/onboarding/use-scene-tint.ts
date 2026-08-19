"use client";

import type { CSSProperties } from "react";
import { useFlagPalette } from "./use-flag-palette";

/**
 * The scene's three colour channels, as inline custom properties.
 *
 * Applied at the page root rather than on the object, because the tint is
 * supposed to travel: the grid, the rules under each option, the progress meter
 * and the readout all derive from these. Putting them on the object alone was
 * what made the first version feel like a widget sitting next to a form.
 */
export function useSceneTint(countryCode: string | null, tintOverride: string | null): CSSProperties {
    const flag = useFlagPalette(countryCode);

    // A brand colour arrives as one hex with nothing to sample, so the shading
    // channel doubles it and the sheen falls back to white.
    const palette = tintOverride
        ? { primary: tintOverride, secondary: tintOverride, tertiary: "#ffffff" }
        : flag;

    return {
        "--sc-a": palette.primary,
        "--sc-b": palette.secondary,
        "--sc-c": palette.tertiary,
    } as CSSProperties;
}
