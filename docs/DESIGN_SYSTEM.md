# Jobak design system

The visual language every signed-in page follows. Tokens live in
[`src/app/globals.css`](../src/app/globals.css); the components that consume
them live in [`src/frontend/components/ui/`](../src/frontend/components/ui/).

> **Visual reference:**
> **[Jobak Design Direction](https://claude.ai/code/artifact/7012da4e-7d23-45be-a954-c0d948571ac1)**
> — the interactive spec: live swatches, the type scale, every component
> rendered before/after, and the four logo concepts at real sizes. Read that
> first if you want to *see* the system; read this if you want to *use* it.

---

## The one rule

**Mono uppercase = the system talking. Sans sentence case = a human reading.**

| Mono, uppercase, `tracking-[0.2em]` | Sans, sentence case |
| --- | --- |
| Section labels, eyebrows, breadcrumbs | Page titles |
| Metadata, counts, timestamps | Form field labels |
| Status text, table headers | Button text, prose, job titles |

This is what keeps the product coherent rather than merely tidy. Settings and
Documents each had half of it and applied that half to everything; splitting by
role lets both survive where each was already right.

Everything below follows from it.

---

## Tokens

### Colour

Defined once in `globals.css`. **Never** reach into Tailwind's default palette
(`green-400`, `blue-500`) in dashboard code — that is exactly how the score
badge and source chips ended up outside the system.

**Ground and ink**

| Token | Value | Use |
| --- | --- | --- |
| `--bg-canvas` | `#08090a` | Page background |
| `--bg-panel` | `#0f1011` | Sidebar, drawer |
| `--bg-surface` | `#191a1b` | Raised panels |
| `--fg-primary` | `#f7f8f8` | Titles, values |
| `--fg-secondary` | `#d0d6e0` | Body copy |
| `--fg-tertiary` | `#8a8f98` | Captions, secondary meta |
| `--fg-quaternary` | `#62666d` | Eyebrows, hints |

**Borders:** `--border-subtle` (5%) for resting cards, `--border-standard` (8%)
for controls, `--border-strong` (12%) for hover.

**Accent — reserved.** `--accent` means *brand and interaction*: the primary
button, the selected row, the active nav item. It does **not** mean "good".

**Match quality — separate on purpose.**

| Token | Range |
| --- | --- |
| `--score-high` | 80–100 |
| `--score-mid` | 60–79 |
| `--score-low` | below 60 |
| `--score-pending` | not yet scored |

Splitting these from `--accent` is why a dashboard full of strong matches no
longer drowns out the one button on it. The thresholds are 80/60 — the drawer
used to use 90/75, so an 82 read green in the list and neutral once opened.

**Source hues** — `--hue-1` … `--hue-8`. Resolved through `sourceHue()` in
[`dashboard/data.ts`](../src/frontend/components/protected/dashboard/data.ts);
known sources are pinned, anything new hashes into the ramp. Rendered as a 5px
dot, never as a filled pill.

### Radius

Semantic names, not overrides of Tailwind's scale — the public marketing pages
still use `rounded-xl` and are not part of this system.

| Class | Value | Use |
| --- | --- | --- |
| `rounded-chip` | 6px | Chips, tags, badges |
| `rounded-control` | 10px | Buttons, inputs, nav items |
| `rounded-card` | 14px | Cards, panels, drawer |
| `rounded-hero` | 20px | Hero / stat blocks |
| `rounded-full` | — | **Filter toggles and avatars only** |

Fully-round survives in exactly one place: filter chips, where roundness is what
signals "toggle, not label".

### Elevation

Depth comes from light, not shadow. `bg-(image:--surface-1)` is a faint
top-down gradient; a flat fill on `#08090a` reads as a patch of slightly-less-black.

- Resting card: `border-border-subtle` + `--surface-1`
- Hover: `border-border-strong` + `-translate-y-px` — **only if it is clickable**
- Selected: `border-accent/40` + `bg-accent/6`

No `box-shadow`, and no glow. The old `shadow-[0_0_24px_...]` on the primary
button dated the whole surface.

### Spacing

4px base. Card padding **20** compact / **24** default. Section gap **48**.
Page gutter **24** mobile / **32** desktop.

**Two container widths, chosen by page type:**

| Width | Page kind | Pages |
| --- | --- | --- |
| `max-w-3xl` | Reading and forms | Settings, Profile |
| `max-w-6xl` | Working surfaces | Dashboard, Documents |

### Type

Geist and Geist Mono, both already loaded.

| Role | Spec | Class |
| --- | --- | --- |
| Display | 26px / 600 / `-0.03em` | page titles |
| Heading | 19px / 600 / `-0.02em` | card + section titles |
| Eyebrow | mono 10px caps `0.2em` | `<Eyebrow>` |
| Label | 13px / 500 | form fields |
| Body | 15px / 1.6 | prose |
| Meta | 12px | captions |
| Data | mono 13px `tabular-nums` | numbers, scores |

Always `tabular-nums` on anything that lines up in a column or changes in place.

---

## Components

Import from `@/frontend/components/ui`.

### `<Button>`

```tsx
<Button variant="primary" size="lg">Run search</Button>
```

| Variant | Use |
| --- | --- |
| `primary` | The one action a page exists to perform. One per view. |
| `secondary` | Everything else with a border. |
| `quiet` | Tertiary — Clear, Cancel, Regenerate. |
| `danger` | Sign out, delete. |

Sizes `sm` / `default` (36px) / `lg` (40px).

> `default`, `outline`, `ghost`, `link` and `destructive` are **legacy** — they
> exist only because the public marketing pages render them, and they keep
> `rounded-md`. Do not use them in the dashboard.

### `<PageHeader>`

```tsx
<PageHeader
  breadcrumb={["Dashboard", "Documents"]}
  title="Application documents"
  description="Paste any job description…"
  backHref="/dashboard"
/>
```

Mono breadcrumb as eyebrow, display title, one line of orientation, a rule that
fades out. Every signed-in page uses it — that is the single biggest reason the
pages now look related.

### `<Card>` / `<Eyebrow>` / `<Section>`

```tsx
<Card interactive>…</Card>
<Section title="Where you're looking" hint="…">…</Section>
```

`interactive` adds the hover lift, and is opt-in because a lift on something you
cannot click is a lie about affordance.

### `<Field>` / `<Input>` / `<Textarea>`

```tsx
<Field label="Display name" hint="Shown as the card title.">
  <Input value={name} onChange={…} />
</Field>
```

Boxed, because the box survives the dense two-column layouts these pages
actually use. The editorial underline (`.field-input` in `globals.css`) stays in
**onboarding only**, where the full-bleed scene is the point and every field
sits alone on the canvas.

### `<Chip>` / `<FilterChip>`

```tsx
<Chip dot={sourceHue(job.source)}>{job.source}</Chip>
<FilterChip selected={active} onClick={…}>Remote</FilterChip>
```

### `<Stat>`

```tsx
<Stat label="Avg match" value="74%" meter={74} meterColor="var(--score-high)" />
```

Mono label above, value large and tabular, optional context, optional meter.
Pass `meter` only when the value is genuinely a proportion.

---

## Scope

**In:** everything under `(protected)` — Dashboard, Documents, Profile,
Settings, and the shell.

**Out, deliberately:**

- **Onboarding.** Its full-bleed scene, underlined fields and ghost numerals are
  a designed set-piece, not drift. It inherits the tokens and keeps its own
  treatment.
- **Public marketing pages.** Untouched. `ui/button.tsx` keeps its legacy
  variants and default for exactly this reason.

## Known gaps

- `job-filters.tsx` and `refresh-cta.tsx` are dead code — nothing renders them.
  They were restyled to the system so they cannot drift, but they duplicate
  live code and should be deleted in a behavioural pass.
- The raster favicons still carry the old mark. See
  [`brand/README.md`](../brand/README.md).
