import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/frontend/lib/utils/utils'

/**
 * One button for the whole product.
 *
 * The dashboard previously grew three incompatible primaries — a solid accent
 * pill with a 24px glow on the dashboard, a sharp mono-caps outline in Settings,
 * and a third bordered variant in the empty state — none of which went through
 * this file. `primary` / `secondary` / `quiet` / `danger` below is what every
 * signed-in page now uses, and they carry the dashboard's `rounded-control`.
 *
 * The shadcn-era variants are kept untouched because the public marketing pages
 * and `not-found` render them, and the public site is not part of this pass.
 * They keep `rounded-md` from the base and `default` stays the fallback, so a
 * bare `<Button>` out there renders exactly as it did before. Nothing new
 * should reach for them.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-canvas)",
  {
    variants: {
      variant: {
        /* ── Dashboard system ───────────────────────────────── */
        /*
         * Reserved for the one action a page exists to perform. The old
         * `shadow-[0_0_24px_...]` glow is deliberately gone — it dated the
         * whole surface and fought the lit-card treatment around it.
         */
        primary:
          'rounded-control bg-accent text-[#06210f] hover:bg-accent-bright active:brightness-95',
        secondary:
          'rounded-control bg-white/3 text-fg-secondary border border-border-standard hover:border-border-strong hover:text-fg-primary',
        quiet:
          'rounded-control bg-transparent text-fg-tertiary hover:text-fg-primary hover:bg-white/4',
        danger:
          'rounded-control bg-transparent text-status-rose border border-status-rose/40 hover:bg-status-rose/10',

        /* ── Legacy: public marketing pages only ────────────── */
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-status-rose text-white hover:bg-status-rose/90',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
