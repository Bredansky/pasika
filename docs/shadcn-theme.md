# shadcn Theme

Use this profile when a project uses shadcn UI tokens as its theme baseline.

## Token layers

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

When building components, write Tailwind utilities such as `bg-primary`, `text-primary-foreground`, and `rounded-lg`. Change token values in the theme file, not component classes.

## Surface tokens

shadcn uses semantic background/foreground pairs. The base token controls the surface color; the `-foreground` token controls readable text/icons on that surface.

| Pattern | Use |
|---|---|
| `bg-background text-foreground` | Page canvas and default app text |
| `bg-card text-card-foreground` | Card or elevated surface content |
| `bg-popover text-popover-foreground` | Floating surfaces like menus, tooltips, dialogs |
| `bg-primary text-primary-foreground` | Main action or selected/high-emphasis filled state |
| `bg-secondary text-secondary-foreground` | Supporting action or lower-emphasis filled state |
| `bg-muted` with `text-foreground` or `text-muted-foreground` | Subtle surface; use muted foreground only for de-emphasized content |
| `bg-accent text-accent-foreground` | Transient hover, active, or current-row surface |

## Mark and control tokens

Some shadcn tokens are marks or control styling, not foreground-paired surfaces.

| Need | Class |
|---|---|
| Default themed border | `border`, `border-b`, etc. |
| Form-control border or input surface treatment | `border-input`, `bg-input/30` |
| Normal input/control text | `text-foreground` |
| Placeholder or helper text | `placeholder:text-muted-foreground` |
| Focus ring or outline | `ring-ring`, `outline-ring/50` |
| Selected state border/ring | `border-primary`, `ring-primary` |

## Status tokens

shadcn includes `destructive` for destructive actions and error emphasis. Fresh shadcn defaults use `bg-destructive text-white`; a project may extend this to `destructive-foreground` if it wants theme-controlled contrast.

Projects may add semantic status pairs when the app has real reusable status roles:

| Pattern | Use |
|---|---|
| `bg-success text-success-foreground` | Success or positive status surface |
| `bg-warning text-warning-foreground` | Warning or caution status surface |
| `bg-info text-info-foreground` | Informational status surface, if the project defines it |

Do not add literal color tokens like `green`, `yellow`, or `status-color-1`. Add a role token only when the role should change with the theme.

## Adding tokens

To add a new shadcn-style token, define it under `:root` and `.dark`, then expose it to Tailwind with `@theme inline`.

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}

@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Then use it by role:

```tsx
<div className="bg-warning text-warning-foreground" />
```
