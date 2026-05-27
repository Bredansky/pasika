# shadcn Theme

Use this profile when a project uses shadcn UI tokens as its theme baseline.

## File structure

Read the theme file by section:

1. `@theme inline` exposes CSS variables to Tailwind utilities.
2. `:root` defines light-mode token values.
3. `.dark` defines dark-mode token values.
4. `@layer base` applies default page, border, and outline styling.

Component authors write utilities such as `bg-primary`, `text-primary-foreground`, and `rounded-lg`. Tailwind resolves those utilities through the tokens registered in `@theme inline`. Do not write generated CSS by hand.

## Registered Tailwind tokens

`@theme inline` maps project CSS variables to Tailwind token names. The categories below mirror the groups in a standard shadcn `globals.css`.

| Category | CSS variables | Utility examples |
|---|---|---|
| Page defaults | `--color-background`, `--color-foreground` | `bg-background`, `text-foreground` |
| Content surfaces | `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground` | `bg-card text-card-foreground`, `bg-popover text-popover-foreground` |
| Action and state surfaces | `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-destructive` | `bg-primary text-primary-foreground`, `bg-muted text-muted-foreground`, `bg-destructive text-white` |
| Borders, form fields, focus | `--color-border`, `--color-input`, `--color-ring` | `border`, `border-input`, `ring-ring`, `outline-ring/50` |
| Charts | `--color-chart-1` through `--color-chart-5` | `bg-chart-1`, `text-chart-2` |
| Sidebar | `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-primary`, `--color-sidebar-primary-foreground`, `--color-sidebar-accent`, `--color-sidebar-accent-foreground`, `--color-sidebar-border`, `--color-sidebar-ring` | `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border` |
| Typography | `--font-sans`, `--font-mono` | `font-sans`, `font-mono` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` |

## Value tokens

`:root` and `.dark` define the actual values for the same semantic tokens. The token names stay stable; only the values change between theme modes.

### Page defaults

| Token | Use |
|---|---|
| `background` | App/page background |
| `foreground` | Default app text |

Use together as `bg-background text-foreground`.

### Content surfaces

| Token pair | Use |
|---|---|
| `card` / `card-foreground` | Card or elevated surface content |
| `popover` / `popover-foreground` | Floating surfaces like menus, tooltips, dialogs |

Use as `bg-card text-card-foreground` and `bg-popover text-popover-foreground`.

### Action and state surfaces

| Token pair | Use |
|---|---|
| `primary` / `primary-foreground` | Main action or selected/high-emphasis filled state |
| `secondary` / `secondary-foreground` | Supporting action or lower-emphasis filled state |
| `muted` / `muted-foreground` | Subtle surface and de-emphasized content |
| `accent` / `accent-foreground` | Transient hover, active, or current-row surface |
| `destructive` | Destructive action or error surface |

Fresh shadcn components use fixed white foreground on destructive filled surfaces:

```tsx
<Button className="bg-destructive text-white" />
```

### Borders, form fields, and focus

| Token | Use |
|---|---|
| `border` | Default borders and separators |
| `input` | Form-control borders and shadcn dark input/outline-control surface treatment |
| `ring` | Focus border, ring, and outline color |

Use these through the utility that matches the CSS property:

| Need | Class |
|---|---|
| Default themed border | `border`, `border-b`, etc. |
| Form field border | `border-input` |
| shadcn dark input/outline-control surface | `dark:bg-input/30`, `dark:border-input`, `dark:hover:bg-input/50` |
| Focus border on controls | `focus-visible:border-ring` |
| Focus ring on controls | `focus-visible:ring-ring/50` plus a ring width such as `focus-visible:ring-[3px]` |
| Focus outline on compound controls | `focus-visible:outline-ring` |
| Base outline color fallback | `outline-ring/50` |

### Charts

`chart-1` through `chart-5` are palette slots for charts and data visualizations. They are not app surface tokens and do not imply foreground pairs.

### Sidebar

Sidebar tokens are scoped versions of the same shadcn roles for sidebar UI:

- `sidebar` / `sidebar-foreground`
- `sidebar-primary` / `sidebar-primary-foreground`
- `sidebar-accent` / `sidebar-accent-foreground`
- `sidebar-border`
- `sidebar-ring`

### Radius and fonts

`radius` is the base radius value. `@theme inline` derives Tailwind radius utilities from it.

`font-sans` and `font-mono` expose project font variables to Tailwind.

## Base layer

shadcn applies default app chrome in `@layer base`:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

The base layer applies `border-border` and `outline-ring/50` globally. Plain `border`, `border-b`, etc. are enough for default themed borders. Add explicit color utilities only for a different role, such as `border-input`, `border-primary`, `border-destructive`, or `focus-visible:border-ring`.

## Adding tokens

Treat fresh shadcn tokens as the baseline. Add project-specific tokens only when the project explicitly adopts an extension beyond shadcn defaults, and document that extension outside this baseline profile.
