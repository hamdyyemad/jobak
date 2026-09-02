# Jobak brand assets

Source files for anything that leaves the product — social profiles, posts, app
icons. Everything here is SVG so it stays editable and exports at any size.

The design system these follow is documented in
[`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md).

## Palette

Only four values are ever needed off-product. They are the sRGB fallbacks of the
app's OKLCH tokens, because SVG and social platforms do not reliably support
OKLCH.

| Role | Hex | Token in the app |
| --- | --- | --- |
| Canvas | `#08090a` | `--bg-canvas` |
| Accent | `#58e68c` | `--accent` |
| Foreground | `#f7f8f8` | `--fg-primary` |
| Muted | `#8a8f98` | `--fg-tertiary` |

## Type

Geist (600 for the wordmark and headlines) and Geist Mono (labels, letter-spaced
`0.2em`, uppercase). Both are already dependencies of the app.

**Export note:** SVG text renders with whatever font the exporting machine has.
If Geist is not installed locally, install it first or convert text to outlines
before exporting — otherwise the fallback stack silently substitutes Segoe UI
and the letter-spacing will not match the product.

## `logo/`

| File | Use |
| --- | --- |
| `mark.svg` | The mark in accent green. Default. |
| `mark-mono.svg` | Same geometry in `currentColor` — set `color` on the parent to place it on any ground. |
| `tile.svg` | The J as negative space in a rounded tile. **App icons and avatars only** — it is the one variant that supplies its own background. |
| `lockup.svg` | The full lockup — mark + `obak`, horizontal. |

The mark is "Horizon J": the J's bowl is the horizon and the detached disc is
the sun above it. It is two elements at one stroke weight, which is what lets it
hold together at 16px. Do not add a container, a gradient or a shadow to it —
the tile is the only approved enclosure, and only for icons.

### The lockup is a ligature

**The mark *is* the J.** The wordmark carries only `obak`, and the two sit
together to read "Jobak" — so never set the mark beside a full "Jobak" or the
letter appears twice.

Getting the spacing right matters, because the mark's box is wider than the
glyph inside it. The stem's outer edge sits at x=45.5 of 64 (x42 plus half the
7-unit stroke), leaving 28.9% of the box as empty bearing on the right. Text
placed at a normal gap clears that padding rather than the letter, and the word
falls apart.

- **In code**, `JobakLogo` pulls the text back by `MARK_SIZE * TUCK`, where
  `TUCK = 0.289 - 0.062` — the bearing less an optical gap. Because it is a
  fraction of the mark size it holds at 26, 32 and 40px with no per-size tuning.
- **In SVG**, there is no flexbox to pull back with, so each `text x` is
  computed from where the stem actually lands:
  `textX = translateX + 45.5 * scale + gap`.
- Anything aligned *under* the lockup (a rule, a tagline) aligns to the J's
  visual left instead: `translateX + 18.5 * scale`.

Keep these in sync with `src/frontend/components/shared/jobak-logo.tsx` and
`src/app/icon.svg`, which carry the same path data.

## `linkedin/`

| File | Size | Placement notes |
| --- | --- | --- |
| `company-logo.svg` | 400×400 | LinkedIn rounds it into a square. Minimum accepted is 300×300. |
| `company-cover.svg` | 1128×191 | The page logo overlaps the left ~180px — the layout keeps that area clear. |
| `personal-cover.svg` | 1584×396 | The profile photo covers the bottom-left corner — nothing load-bearing goes there. |
| `post-announcement.svg` | 1200×627 | 1.91:1, the ratio LinkedIn leaves uncropped in the feed. For releases and features. |
| `post-square.svg` | 1080×1080 | For posts built around a single number. Takes more feed height, so use it when the number earns it. |

The two post files are **templates**. Replace the eyebrow, headline, support
line and (on the square) the stat; leave the palette, mark, rule and footer
alone so a run of posts reads as one voice. Keep post headlines under roughly 60
characters or they need a third line and collide with the footer rule.

## Exporting to PNG

LinkedIn needs raster. With Inkscape:

```bash
inkscape brand/linkedin/company-cover.svg -o company-cover.png -w 1128
inkscape brand/linkedin/post-announcement.svg -o post-announcement.png -w 1200
```

Or with `rsvg-convert`:

```bash
rsvg-convert -w 1128 brand/linkedin/company-cover.svg -o company-cover.png
```

Export PNGs are deliberately **not** committed — they go stale against the SVG
and there is no way to tell by looking.

## App icons

Generated, not hand-exported:

```bash
pnpm scripts        # → Icons → 1
tsx scripts/icons/generate-icons.ts
```

It rasterises `logo/tile.svg` into everything that cannot stay SVG, and is the
only thing that should ever write these files:

| Output | From | Serves |
| --- | --- | --- |
| `src/app/favicon.ico` | tile, 16+32+48 | Browser tabs. Keeps the tile's rounding — nothing masks a favicon. |
| `public/icons/icon-192.png` | tile | Manifest, `purpose: any` |
| `public/icons/icon-512.png` | tile | Manifest, install prompt and splash |
| `public/icons/icon-maskable-512.png` | tile inset to 80% on canvas | Manifest, `purpose: maskable` |

The PNGs live in `public/` because only `favicon`, `icon` and `apple-icon` are
file conventions Next serves out of `src/app/` — the `android-chrome-*.png` and
`favicon-*.png` files that used to sit there were unreachable at any URL, which
is why the manifest could not name them. They carried the old sun-and-horizon
badge for weeks with no way to tell by looking, and have been deleted.

`icon.svg` (the bare mark) and `apple-icon.tsx` (the tile, full bleed) are not
produced by the script — they are source, and carry the same path data as
`logo/mark.svg` and `logo/tile.svg`. Keep all four in sync by hand.

**Why the tile and not the mark.** An app icon is always composited onto
someone else's wallpaper or browser chrome, so it has to supply its own ground.
The tile is green with the J knocked out as *negative space*, so every raster
here flattens it onto `#08090a`; left transparent, the J fills with whatever
sits behind it.
