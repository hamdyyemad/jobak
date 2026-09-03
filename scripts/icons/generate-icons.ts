/**
 * Rasterises the app icons from `brand/logo/tile.svg`.
 *
 * The icons are the one part of the brand that cannot stay SVG: `favicon.ico`
 * is a raster container by definition, and a PWA manifest needs PNGs at fixed
 * sizes. So they get committed, which means they can go stale against the mark
 * — and they did. Every checked-in PNG carried the *previous* sun-and-horizon
 * badge for weeks after the mark was replaced, because nothing regenerated
 * them and nothing could tell by looking.
 *
 * This script is the answer to that: one command, sourced from the same
 * `tile.svg` the rest of the brand uses, so re-running it after a mark change
 * is the whole job.
 *
 *   pnpm scripts        → Icons → 1
 *   tsx scripts/icons/generate-icons.ts
 *
 * `tile.svg` is the right source rather than `mark.svg` because an app icon is
 * always composited onto someone else's wallpaper or browser chrome and has to
 * supply its own ground — see the brand README. The tile is green with the J
 * knocked out as *negative space*, so every render here flattens it onto the
 * canvas colour; left transparent, the J would fill with whatever sits behind.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

/*
 * Only the surface this script touches, declared locally.
 *
 * `typeof import("sharp")` cannot be used for the same reason `require("sharp")`
 * cannot: the package is not resolvable from the repo root, so tsc reports
 * TS2307 on the import type even though the value loads fine at runtime.
 */
interface SharpImage {
    resize(width: number, height: number, options?: { fit?: string; background?: string; kernel?: string }): SharpImage;
    flatten(options: { background: string }): SharpImage;
    ensureAlpha(): SharpImage;
    png(options?: { compressionLevel?: number }): SharpImage;
    composite(items: { input: Buffer; gravity?: string }[]): SharpImage;
    toFile(path: string): Promise<unknown>;
    toBuffer(): Promise<Buffer>;
}

interface Sharp {
    (input: Buffer, options?: { density?: number }): SharpImage;
    (options: {
        create: { width: number; height: number; channels: number; background: string };
    }): SharpImage;
}

/**
 * sharp, which is present but not addressable.
 *
 * It ships as a transitive dependency of Next (image optimisation), and pnpm's
 * strict layout means a plain `require("sharp")` from this script throws
 * MODULE_NOT_FOUND — it is only linked into Next's own subtree. Reading it out
 * of the store keeps it out of `package.json`, which is the right trade for a
 * script that runs by hand when the mark changes.
 *
 * If this ever fails, `pnpm add -D sharp` is the fix and this helper can go.
 */
function loadSharp(): Sharp {
    try {
        return require("sharp");
    } catch {
        const store = join(ROOT, "node_modules/.pnpm");
        const dir = readdirSync(store).find((name) => /^sharp@/.test(name));
        if (!dir) {
            throw new Error("sharp is not installed — run `pnpm add -D sharp` and retry.");
        }
        return require(join(store, dir, "node_modules/sharp"));
    }
}

const CANVAS = "#08090a"; // --bg-canvas, the sRGB fallback. See brand/README.md.
const ROOT = process.cwd();
const TILE = readFileSync(join(ROOT, "brand/logo/tile.svg"));
const sharp = loadSharp();

/** High density so the rounded corners and the J's bowl stay clean at 512. */
const DENSITY = 600;

/**
 * The tile, flattened onto the canvas so the knocked-out J reads as dark.
 *
 * `ensureAlpha` is load-bearing rather than tidy-minded. `flatten` composites
 * away the alpha channel and leaves a 3-channel RGB PNG, and Next's `.ico`
 * decoder rejects those outright — `Format error decoding Ico: The PNG is not
 * in RGBA format!`, which fails the production build, not just the icon. So the
 * channel is added back, fully opaque, after the flatten that removed it.
 */
function render(size: number) {
    return sharp(TILE, { density: DENSITY })
        .resize(size, size, { fit: "contain", background: CANVAS })
        .flatten({ background: CANVAS })
        .ensureAlpha()
        .png({ compressionLevel: 9 });
}

/**
 * The maskable variant, which is a different picture rather than a resize.
 *
 * Android crops a maskable icon to whatever shape the launcher uses — circle,
 * squircle, teardrop — guaranteeing only the inner 80%. Feeding it the plain
 * tile would round off corners that are already rounded and clip the J. So the
 * artwork is inset to the safe zone on a full-bleed canvas ground: a circular
 * crop then eats only margin, and the tile arrives intact.
 */
async function renderMaskable(size: number): Promise<Buffer> {
    const inner = Math.round(size * 0.8);
    const art = await sharp(TILE, { density: DENSITY }).resize(inner, inner).png().toBuffer();

    return sharp({
        create: { width: size, height: size, channels: 4, background: CANVAS },
    })
        .composite([{ input: art, gravity: "centre" }])
        .flatten({ background: CANVAS })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toBuffer();
}

/**
 * Packs PNGs into an ICO container.
 *
 * sharp has no ICO encoder and the format does not need one: since Vista an
 * icon directory may hold PNG payloads verbatim, which every browser in scope
 * reads. So this is a 6-byte header, a 16-byte directory entry per size, and
 * the PNG bytes — cheaper than taking a dependency for it.
 */
function buildIco(images: { size: number; data: Buffer }[]): Buffer {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // 1 = icon
    header.writeUInt16LE(images.length, 4);

    let offset = 6 + images.length * 16;
    const entries: Buffer[] = [];

    for (const { size, data } of images) {
        const entry = Buffer.alloc(16);
        // 0 means 256 in this field; every size here is smaller, but the
        // modulo keeps that true if someone adds 256 later.
        entry.writeUInt8(size % 256, 0);
        entry.writeUInt8(size % 256, 1);
        entry.writeUInt8(0, 2); // palette size — 0 for PNG payloads
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // colour planes
        entry.writeUInt16LE(32, 6); // bits per pixel
        entry.writeUInt32LE(data.length, 8);
        entry.writeUInt32LE(offset, 12);
        entries.push(entry);
        offset += data.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
    const iconsDir = join(ROOT, "public/icons");
    await mkdir(iconsDir, { recursive: true });

    /*
     * 16, 32 and 48 are the sizes a browser actually asks an .ico for — tab,
     * bookmark bar, and Windows shortcut. Anything larger is what icon.svg and
     * the manifest PNGs are for, and only inflates a file served on every
     * page load.
     */
    const ico = buildIco(
        await Promise.all(
            [16, 32, 48].map(async (size) => ({ size, data: await render(size).toBuffer() }))
        )
    );
    await writeFile(join(ROOT, "src/app/favicon.ico"), ico);
    console.log(`src/app/favicon.ico            16+32+48   ${ico.length} bytes`);

    // 192 and 512 are the two the install prompt and the splash screen use.
    for (const size of [192, 512]) {
        const file = join(iconsDir, `icon-${size}.png`);
        await render(size).toFile(file);
        console.log(`public/icons/icon-${size}.png`.padEnd(31) + `${size}×${size}`);
    }

    const maskable = await renderMaskable(512);
    await writeFile(join(iconsDir, "icon-maskable-512.png"), maskable);
    console.log(`public/icons/icon-maskable-512.png  512×512 (80% safe zone)`);

    console.log("\nRegistered in src/app/manifest.ts — update it if you add a size.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
