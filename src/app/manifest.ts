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
 * The PNGs below live in `public/icons/` rather than `src/app/`. That is not a
 * style choice: only `favicon`, `icon` and `apple-icon` are file conventions
 * Next serves out of the app directory, so the `android-chrome-*.png` files
 * that used to sit there were never reachable at any URL — which is why the
 * manifest could not reference them and listed `icon.svg` alone. Anything the
 * manifest names has to be a static file.
 *
 * All three are generated from `brand/logo/tile.svg` by
 * `scripts/icons/generate-icons.ts`. Re-run it when the mark changes; nothing
 * else regenerates them and a stale icon is invisible until someone installs
 * the app.
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
            { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
            { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
            /*
             * Separate artwork, not the same file relabelled. A launcher crops a
             * maskable icon to its own shape and guarantees only the inner 80%,
             * so this one is the tile inset on a full-bleed ground — listing the
             * plain tile as `maskable` is the common mistake that gets the
             * corners shaved off.
             */
            {
                src: "/icons/icon-maskable-512.png",
                type: "image/png",
                sizes: "512x512",
                purpose: "maskable",
            },
        ],
    };
}
