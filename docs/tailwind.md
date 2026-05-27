# Tailwind

## Token system

### Three-layer setup

```
oklch(0.205 0 0)                        <- actual value, defined once in :root / .dark
        |
--primary                               <- semantic CSS var (role, not value)
        |
--color-primary: var(--primary)         <- registered in @theme inline
        |
bg-primary { background-color: var(--color-primary) }  <- Tailwind utility
```

```css
/* globals.css */

/* Layer 1 - values, swapped per theme */
:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}
.dark {
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
}

/* Layer 2 - register as Tailwind tokens */
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

Token names describe **role**, not value. Every color token has a `foreground` pair: the text/icon color safe to use on that surface.

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

The test: open any component. Every color class should be a token name (`bg-primary`, `text-muted-foreground`). If you see `bg-[oklch(...)]`, `text-white`, `text-gray-500`: either a token is missing or it's a genuine one-off.

This applies to all token types: colors, radius, spacing, fonts, shadows, animations.

## When to use @utility

Use `@utility` when Tailwind has no built-in class for the behaviour you need:

```css
/* Multi-property transition not covered by Tailwind */
@utility transition-border-shadow {
  transition-property: border-color, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

Never use raw CSS on component elements. If Tailwind doesn't cover it, add a `@utility`.

## Decision checklist

1. Is this a color/value for app interface styling? Use a role token, not a matching raw value.
2. Should two styles change together with the theme? Use the same token.
3. Is the variation just an interaction state? Opacity modifiers on token utilities are OK.
4. Does Tailwind lack the CSS behaviour you need? Add `@utility` to `globals.css`.
