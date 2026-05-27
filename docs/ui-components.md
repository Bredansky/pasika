# UI Components

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
| `cn` always | Merge point: lets callers override individual utilities via `className` |
| `ComponentProps<"div">` not a custom interface | Automatically forwards all native HTML attributes |
| `data-slot` on root | Stable hook for CSS parent-to-child targeting via `has-data-[slot=x]` |

### asChild / Slot

`asChild` lets consumers change the rendered element without a DOM wrapper:

```tsx
// renders a styled <a>, not <button><a>
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

Use `asChild` on any primitive that might need to render as a different element: links, custom triggers, etc.

### Compound components

For components with subparts (Card, Dialog, etc.), use no `cva`; just `cn`. Every subcomponent gets its own `data-slot`:

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

`data-slot` enables CSS parent-to-child targeting without JS:

```tsx
// CardHeader reshapes its grid when CardAction is present
'has-data-[slot=card-action]:grid-cols-[1fr_auto]'
```

## Decision checklist for a new primitive

1. Does it have variants? Use `cva`. No variants? Use `cn` only.
2. Might it need to render as a different element? Add `asChild` + `Slot`.
3. Does it have subparts? Use the compound component pattern, with `data-slot` on each subpart.
4. Does it need caller overrides? Keep `className` merged through `cn`.
5. Does it introduce styling values? Follow the Tailwind token and utility rules.
