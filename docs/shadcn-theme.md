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
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl` | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` |

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

| Token | shadcn use | Utility examples |
|---|---|---|
| `border` | Default borders and separators | `border`, `border-b` |
| `input` | Form-control border color and input-like surface treatment | `border-input`, `dark:bg-input/30`, `dark:border-input`, `dark:hover:bg-input/50` |
| `ring` | Focus border, ring, and outline color | `focus-visible:border-ring`, `focus-visible:ring-ring/50`, `focus-visible:outline-ring`, `outline-ring/50` |

The base layer already applies `border-border` and `outline-ring/50`; component code usually needs only the structural border utility (`border`, `border-b`, etc.) unless it is using another border role or overriding a competing border-color class.

### Charts

`chart-1` through `chart-5` are palette slots for charts and data visualizations. They are not app surface tokens and do not imply foreground pairs.

### Sidebar

Sidebar tokens are scoped versions of the same shadcn roles for sidebar UI:

- `sidebar` / `sidebar-foreground`
- `sidebar-primary` / `sidebar-primary-foreground`
- `sidebar-accent` / `sidebar-accent-foreground`
- `sidebar-border`
- `sidebar-ring`

### Radius

`radius` is the base radius value. `@theme inline` derives Tailwind radius utilities from it.

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

The base layer applies `border-border` and `outline-ring/50` globally. Plain `border`, `border-b`, etc. inherit the default border color when no competing border-color class is present. Add an explicit border color for another role, such as `border-input`, `border-primary`, `border-destructive`, or `focus-visible:border-ring`, or when overriding a component variant such as `border-transparent`.

## Adding tokens

Treat fresh shadcn tokens as the baseline. Add project-specific tokens only when the project explicitly adopts an extension beyond shadcn defaults, and document that extension outside this baseline profile.
