# Global Stylesheet Rule

Scattered project stylesheets and competing Tailwind entry points make CSS ownership, global defaults, and styling dependencies difficult to trace. A single, predictable stylesheet import tree prevents these inconsistencies as project CSS grows.

- Project stylesheets MUST live under `src/app/styles/`, with `globals.css` as the sole Tailwind entry point.
- The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.
- CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
- Fixed tokens MUST use `@theme`; tokens referencing CSS variables MUST use `@theme inline`.
- Tokens declared in non-inline `@theme` blocks MUST NOT be overridden in CSS selectors.
- Self-named `@theme inline` mappings MUST have a default `:root` declaration and a matching scoped, conditional, or programmatic override.
- Cross-variable references in `@theme inline` MUST target tokens declared in non-inline `@theme`, except external `--font-*` variables, which MUST have a nonempty `var()` fallback.
- Non-custom-property style declarations in global selectors inside `@layer base` MUST use `@apply` instead of raw CSS properties.
- Outside `@layer base`, global selectors MUST contain only CSS custom-property declarations, including default `:root` values and scoped or conditional overrides.
- The global stylesheet entry point MUST order imports, `@custom-variant` definitions, `:root` variables and selectors or conditions that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order.
- The global base layer MUST apply `base-canvas` and `base-ink` to the document body as the default page pair.

## Incorrect — Theme Overrides a Tailwind Token

```css
@theme {
  --color-primary-canvas: #fafafa;
}

[data-theme="dark"] {
  --color-primary-canvas: #18181b;
}
```

Why: Pasika prohibits overriding direct `@theme` tokens in selectors. This is a design-token ownership convention, not a CSS limitation; use the documented runtime mapping when scoped values are required.

## Correct — Theme Overrides the Runtime Color

```css
:root {
  --color-primary-canvas: #fafafa;
}

[data-theme="dark"] {
  --color-primary-canvas: #18181b;
}

@theme inline {
  --color-primary-canvas: var(--color-primary-canvas);
}
```

Why: `:root` defines the runtime value, scoped selectors override it, and `@theme inline` makes it available as a Tailwind utility.

## Incorrect — Scoped Radius Overrides a Fixed Token

```css
@theme {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}
```

Why: Pasika prohibits scoped overrides of direct `@theme` tokens; use a matching runtime variable and `@theme inline` when a scoped value is required.

## Correct — Scoped Radius Uses the Same Token Name

```css
:root {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}

@theme inline {
  --radius-card: var(--radius-card);
}
```

Why: the self-named mapping is valid CSS and supplies default and scoped values for `rounded-card`; requiring a default `:root` is a Pasika convention, not a CSS requirement. Without a detected override, the bridge is redundant and `--radius-card: 8px` belongs directly in `@theme`.

## Incorrect — Competing Global Stylesheet Entry Points

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme {
  --spacing: 0.25rem;
}

/* src/app/styles/editor.css */
@import "tailwindcss";

@theme {
  --font-editor: Georgia, serif;
}
```

Why: Tailwind and theme definitions are split across competing global entry points, so neither file clearly owns the system.

## Incorrect — Project CSS Reached Only Through a Midpoint

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./base.css";

/* src/app/styles/base.css — import-only shim */
@import "./deep.css";

/* src/app/styles/deep.css */
:root {
  --content-gap: 1rem;
}
```

Why: `deep.css` is imported through `base.css` instead of directly by `globals.css`. Every project stylesheet must be a direct import, including import-only files.

## Correct — Project CSS Imported Directly by the Entry

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./home.css";

/* src/app/styles/home.css */
@utility home-banner {
  @apply text-base-ink;
}
```

```tsx
// src/app/layout.tsx
import "./styles/globals.css";
```

Why: the root layout imports one global CSS entry point, which directly imports `home.css` for the `home` feature. Shared theme tokens and base styles may stay in `globals.css`.

## Correct — One Global Stylesheet Owns the System

```css
@import "tailwindcss";

:root {
  --color-base-canvas: #ffffff;
  --color-base-ink: #18181b;
  --color-accent-canvas: #2563eb;
}

[data-theme="dark"] {
  --color-base-canvas: #09090b;
  --color-base-ink: #fafafa;
  --color-accent-canvas: #60a5fa;
}

@theme {
  --*: initial;
  --spacing: 0.25rem;
}

@theme inline {
  --color-base-canvas: var(--color-base-canvas);
  --color-base-ink: var(--color-base-ink);
  --color-accent-canvas: var(--color-accent-canvas);
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

Why: one entry point defines literal spacing in `@theme` and maps theme-dependent colors through `@theme inline`; the runtime variables provide light defaults and scoped dark overrides without duplicating token names.
