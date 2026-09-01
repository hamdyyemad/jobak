import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * This is the one place the mark keeps a container: an app icon is always
 * composited onto someone else's wallpaper, so it has to supply its own ground.
 * Uses the tile lock-up (the J as negative space) rather than the bare mark,
 * which is exactly the case `JobakTile` exists for.
 *
 * Generated so it tracks the brand. The checked-in `apple-touch-icon.png` still
 * carries the old sun-and-horizon badge; this file convention takes precedence
 * over it, and that stale PNG should be deleted once you have confirmed the
 * icon renders as you want.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
                    background: "#08090a",
                }}
            >
                <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
                    <path
                        d="M45 14 V36 A13 13 0 0 1 19 36"
                        stroke="#58e68c"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <circle cx="23" cy="18" r="5.5" fill="#58e68c" />
                </svg>
            </div>
        ),
        { ...size }
    );
}
