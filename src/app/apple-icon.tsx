import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * This is the one place the mark keeps a container: an app icon is always
 * composited onto someone else's wallpaper, so it has to supply its own ground.
 * That is the tile — the J as negative space — and not the bare mark, which
 * this file claimed to use in prose while drawing the mark on a dark square.
 *
 * **Full bleed, and deliberately not rounded.** `tile.svg` carries a 17/64
 * corner radius for use in the product, but iOS applies its own squircle mask
 * to a home-screen icon. Shipping our rounding inside theirs would leave four
 * dark slivers where the two radii disagree, so the ground runs edge to edge
 * and iOS cuts the shape. The same reason `favicon.ico` *keeps* the rounding:
 * nothing masks a favicon.
 *
 * Generated rather than checked in so it tracks the brand — the path data below
 * is the tile's, minus its rounded-rect outer contour.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ACCENT = "#58e68c";
const CANVAS = "#08090a";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: ACCENT,
                }}
            >
                <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
                    {/*
                        Drawn as positive shapes in the canvas colour rather than
                        knocked out of the tile with `evenodd`: there is no
                        rounded-rect contour here to knock them out of, and a
                        hole would expose the wallpaper instead of the ground.
                    */}
                    <path d="M36 12 H44 V34 A12 12 0 0 1 20 34 H28 A4 4 0 0 0 36 34 Z" fill={CANVAS} />
                    <circle cx="26" cy="18" r="4.4" fill={CANVAS} />
                </svg>
            </div>
        ),
        { ...size }
    );
}
