# Tailwind & UI Components

## Component anatomy

Every UI primitive follows this exact pattern:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

// 1. cva for variants (omit entirely if no variants)
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

// 2. Props = ComponentProps<"button"> + VariantProps + { asChild? }
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  // 3. Slot for polymorphism
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"        // 4. data-slot always on root
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### The four rules

| Rule | What it does |
|---|---|
| `cva` for variants | Owns the class logic. Omit if component has no variants. |
| `cn` always | Merge point — lets callers override individual utilities via `className` |
| `ComponentProps<"div">` not a custom interface | Automatically forwards all native HTML attributes |
| `data-slot` on root | Stable hook for CSS parent→child targeting via `has-data-[slot=x]` |

### asChild / Slot

`asChild` lets consumers change the rendered element without a DOM wrapper:

```tsx
// renders a styled <a>, not <button><a>
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

Use `asChild` on any primitive that might need to render as a different element (links, custom triggers, etc.).

### Compound components

For components with subparts (Card, Dialog, etc.) — no `cva`, just `cn`. Every subcomponent gets its own `data-slot`:

```tsx
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground rounded-xl border shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 px-6 pt-6', className)}
      {...props}
    />
  );
}
```

`data-slot` enables CSS parent→child targeting without JS:

```tsx
// CardHeader reshapes its grid when CardAction is present
'has-data-[slot=card-action]:grid-cols-[1fr_auto]'
```

---

## Token system

### Three-layer setup

```
oklch(0.205 0 0)                        ← actual value, defined once in :root / .dark
        ↓
--primary                               ← semantic CSS var (role, not value)
        ↓
--color-primary: var(--primary)         ← registered in @theme inline
        ↓
bg-primary { background-color: var(--color-primary) }  ← Tailwind utility
```

```css
/* globals.css */

/* Layer 1 — values, swapped per theme */
:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}
.dark {
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
}

/* Layer 2 — register as Tailwind tokens */
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

You never touch layers 2 or 3 when building components. You only write `bg-primary`, `text-primary-foreground`, `rounded-lg` etc.

### Semantic roles

Token names describe **role**, not value. Every color token has a `foreground` pair — the text/icon color safe to use on that surface:

| Token | Role |
|---|---|
| `background` / `foreground` | Page canvas + default text |
| `primary` / `primary-foreground` | Main CTA, selected state |
| `secondary` / `secondary-foreground` | Supporting action |
| `muted` / `muted-foreground` | Subtle surface + de-emphasized text |
| `accent` / `accent-foreground` | Hover state for ghost/outline elements |
| `destructive` / `destructive-foreground` | Danger, error, irreversible actions |
| `card` / `card-foreground` | Elevated surface |
| `popover` / `popover-foreground` | Floating surface (dropdown, tooltip) |
| `border` | Dividers, input borders |
| `input` | Input background |
| `ring` | Focus ring |

Non-color tokens follow the same pattern: `--radius`, `--font-sans`, `--font-mono`.

### Token rule

> Use theme tokens for Tailwind color utilities in the app interface. Tokens represent UI roles, not matching color values. Use the same token only when the styles should change together with the theme. Opacity modifiers on token utilities are OK for interaction states.

The test: open any component. Every color class should be a token name (`bg-primary`, `text-muted-foreground`). If you see `bg-[oklch(...)]`, `text-white`, `text-gray-500` — either a token is missing or it's a genuine one-off.

This applies to all token types — colors, radius, spacing, fonts, shadows, animations.

### When to use @utility

Use `@utility` when Tailwind has no built-in class for the behaviour you need:

```css
/* Multi-property transition not covered by Tailwind */
@utility transition-border-shadow {
  transition-property: border-color, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

Never use raw CSS on component elements — if Tailwind doesn't cover it, add a `@utility`.

---

## Decision checklist for a new primitive

1. Does it have variants? → use `cva`. No variants? → use `cn` only.
2. Might it need to render as a different element? → add `asChild` + `Slot`.
3. Does it have subparts? → compound component pattern, `data-slot` on each subpart.
4. Does it introduce a new color/value used in 2+ places? → add token to `:root` + `@theme inline` first, then write the class.
5. Does it need a CSS behaviour Tailwind can't express? → add `@utility` to globals.css.
