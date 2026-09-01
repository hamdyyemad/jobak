import type { MetadataRoute } from "next";

/**
 * The web app manifest.
 *
 * Replaces `site.webmanifest`, which was never actually served: it sat in
 * `src/app/` where Next only serves recognised metadata conventions, so the
 * `manifest: "/site.webmanifest"` link in `metadata.ts` resolved to a 404 — and
 * so did every icon it listed. This file convention is served, and Next emits
 * the `<link rel="manifest">` for it automatically.
 *
 * `icon.svg` is the only icon referenced because it is the one asset that is
 * actually current. The checked-in android-chrome PNGs still carry the old
 * sun-and-horizon badge; add them back here once they have been re-exported
 * from the new mark.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Jobak — AI Job Matching Platform",
        short_name: "Jobak",
        description: "Find your perfect job with AI-powered recommendations",
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#08090a",
        theme_color: "#58e68c",
        icons: [
            {
                src: "/icon.svg",
                type: "image/svg+xml",
                sizes: "any",
                purpose: "any",
            },
        ],
    };
}
