# shadcn Theme

Use this profile when a project uses shadcn UI tokens as its theme baseline.

## Token layers

```
oklch(0.205 0 0)                        <- actual value, defined per theme mode in :root / .dark
        |
--primary                               <- semantic CSS var (role, not value)
        |
--color-primary: var(--primary)         <- registered in @theme inline
        |
className="bg-primary"                  <- utility authors write in components
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

Tailwind resolves utilities like `bg-primary` to the registered `--color-primary` token. Do not write generated CSS by hand.

When building components, write Tailwind utilities such as `bg-primary`, `text-primary-foreground`, and `rounded-lg`. Change token values in the project's theme CSS, not component classes.

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
| `bg-destructive text-white` | Destructive action or error surface in fresh shadcn components |

## Mark and control tokens

Some shadcn tokens are marks or control styling, not foreground-paired surfaces.

| Need | Class |
|---|---|
| Default themed border | `border`, `border-b`, etc. |
| Form-control border | `border-input` |
| Dark outline/control surface treatment in shadcn primitives | `dark:bg-input/30` |
| Normal input/control text | `text-foreground` |
| Placeholder or helper text | `placeholder:text-muted-foreground` |
| Focus ring or outline | `ring-ring`, `outline-ring/50` |
| Selected state border/ring | `border-primary`, `ring-primary` |

## Destructive token

Fresh shadcn includes `destructive` for destructive actions and error emphasis. Generated shadcn components use fixed white foreground on destructive filled surfaces:

```tsx
<Button className="bg-destructive text-white" />
```

## Adding tokens

Treat fresh shadcn tokens as the baseline. Add project-specific tokens only when the project explicitly adopts an extension beyond shadcn defaults, and document that extension outside this baseline profile.
