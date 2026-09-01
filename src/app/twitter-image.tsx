/**
 * X / Twitter reuses the Open Graph card verbatim.
 *
 * The two are the same 1200x630 and say the same thing, so this re-exports
 * rather than keeping a second copy that drifts. `metadata.ts` already declares
 * `card: "summary_large_image"`, which is the size this matches.
 */
export { default, alt, size, contentType } from "./opengraph-image";
