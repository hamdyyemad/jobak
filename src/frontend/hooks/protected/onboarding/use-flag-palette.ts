"use client";

import { useEffect, useState } from "react";
import { flagUrl } from "@/frontend/lib/configs/countries";

export interface FlagPalette {
    primary: string;
    secondary: string;
    tertiary: string;
}

/** Used before a country is chosen, and if a flag ever fails to load. */
export const NEUTRAL_PALETTE: FlagPalette = {
    primary: "#52c36b",
    secondary: "#2f7a45",
    tertiary: "#8a8f98",
};

/** Sampling is pure and the flags never change, so results are shared process-wide. */
const cache = new Map<string, FlagPalette>();

/**
 * Sampling grid. Small on purpose: we want the handful of colours a flag is
 * *made of*, not a faithful histogram, and a 32x21 draw collapses gradients,
 * emblems and anti-aliasing into the few dominant fills.
 */
const SAMPLE_W = 32;
const SAMPLE_H = 21;

type RGB = [number, number, number];

function toHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(r: number, g: number, b: number): number {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** HSV saturation — 0 for any grey, 1 for a pure hue. */
function saturation([r, g, b]: RGB): number {
    const max = Math.max(r, g, b);
    if (max === 0) return 0;
    return (max - Math.min(r, g, b)) / max;
}

function isNearWhite(rgb: RGB): boolean {
    return luminance(...rgb) > 0.82 && saturation(rgb) < 0.15;
}

/** Mixes a colour toward black by `amount`, for the object's shaded side. */
function shade([r, g, b]: RGB, amount: number): RGB {
    return [
        Math.round(r * (1 - amount)),
        Math.round(g * (1 - amount)),
        Math.round(b * (1 - amount)),
    ];
}

/**
 * Pulls a very dark colour up until it can carry light on the canvas. Black is a
 * real flag colour (Egypt, Germany, Kenya) but a black orb on a near-black page
 * is just a hole, so it is raised rather than discarded.
 */
function ensureVisible(r: number, g: number, b: number): RGB {
    const lum = luminance(r, g, b);
    if (lum >= 0.22) return [r, g, b];
    const lift = (0.22 - lum) * 255;
    return [
        Math.min(255, Math.round(r + lift)),
        Math.min(255, Math.round(g + lift)),
        Math.min(255, Math.round(b + lift)),
    ];
}

function extract(image: HTMLImageElement): FlagPalette {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return NEUTRAL_PALETTE;

    ctx.drawImage(image, 0, 0, SAMPLE_W, SAMPLE_H);
    const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

    // Quantise to 5 bits per channel so anti-aliased edges fold into their parent
    // fill instead of each becoming its own "colour".
    const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.count++;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
        } else {
            buckets.set(key, { count: 1, r, g, b });
        }
    }

    const sampled = SAMPLE_W * SAMPLE_H;
    const ranked = [...buckets.values()]
        .sort((a, b) => b.count - a.count)
        .map(({ count, r, g, b }) => ({
            rgb: [
                Math.round(r / count),
                Math.round(g / count),
                Math.round(b / count),
            ] as RGB,
            share: count / sampled,
        }));

    if (ranked.length === 0) return NEUTRAL_PALETTE;

    /*
     * Rank by area, but *choose* by saturation — with a floor on area.
     *
     * Largest-band-wins alone gives Egypt and Japan white spheres: correct, and
     * useless, because the object stops reading as that country. Saturation alone
     * goes the other way and latches onto emblems — Egypt's eagle is a few gold
     * pixels, and it turned the whole sphere olive. A colour has to be both
     * saturated and actually present to win.
     */
    const MIN_SHARE = 0.08;
    const bands = ranked.filter((c) => c.share >= MIN_SHARE);
    const saturated = bands.filter((c) => saturation(c.rgb) > 0.28);

    const primary = (saturated[0] ?? bands[0] ?? ranked[0]).rgb;

    // Shading wants a second, darker colour. A near-white runner-up would flatten
    // the sphere into a marble, so it falls back to a darkened primary instead.
    const runnerUp = (saturated[1] ?? bands.find((c) => c.rgb !== primary))?.rgb;
    const secondary = runnerUp && !isNearWhite(runnerUp) ? runnerUp : shade(primary, 0.45);

    // The sheen wants the lightest band there is, and white if there is none.
    const lightest = [...bands].sort((a, b) => luminance(...b.rgb) - luminance(...a.rgb))[0];

    return {
        primary: toHex(...ensureVisible(...primary)),
        secondary: toHex(...ensureVisible(...secondary)),
        tertiary: toHex(...(lightest?.rgb ?? ([255, 255, 255] as RGB))),
    };
}

/**
 * The dominant colours of a country's flag, read straight off the flag we ship.
 *
 * Sampling beats a hand-written colour table: it cannot drift out of step with
 * the artwork, and it covers every country we ship without anyone maintaining a list.
 * The flags are same-origin, so the canvas stays readable.
 */
export function useFlagPalette(code: string | null): FlagPalette {
    /*
     * The cache is the state. Render reads straight out of it, and the effect's
     * only job is to fill it — so nothing is set synchronously during an effect,
     * and a country already sampled paints on the first render with no flash.
     */
    const [, setSampleCount] = useState(0);

    useEffect(() => {
        if (!code || cache.has(code)) return;

        let cancelled = false;
        const image = new Image();
        image.src = flagUrl(code);

        image.onload = () => {
            if (cancelled) return;
            cache.set(code, extract(image));
            setSampleCount((n) => n + 1);
        };
        image.onerror = () => {
            if (cancelled) return;
            cache.set(code, NEUTRAL_PALETTE);
            setSampleCount((n) => n + 1);
        };

        return () => {
            cancelled = true;
        };
    }, [code]);

    if (!code) return NEUTRAL_PALETTE;
    return cache.get(code) ?? NEUTRAL_PALETTE;
}
