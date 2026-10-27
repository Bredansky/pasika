# Global Stylesheet Rule

Scattered project stylesheets and competing Tailwind entry points make CSS ownership, global defaults, and styling dependencies difficult to trace. A single, predictable stylesheet import tree prevents these inconsistencies as project CSS grows.

- A repository MUST have one global stylesheet entry point that registers Tailwind.
- Project stylesheets MUST live under `src/app/styles/`, and the global stylesheet entry point MUST be `src/app/styles/globals.css`.
- The global stylesheet entry point MUST be imported by exactly one module (the root layout). Project CSS MAY live in that entry point; every other stylesheet MUST be reachable from it via `@import`, and any other stylesheet holding project CSS MUST be imported by the entry point directly.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
- Tailwind tokens MUST use `@theme inline` when referencing `var()`, and `@theme` otherwise.
- Tokens declared in `@theme` MUST NOT be overridden in CSS selectors.
- Tokens using `@theme inline` MUST reference same-named variables defined in `:root`. Theme-specific overrides MUST preserve those names.
- Style declarations added by the project inside global selectors MUST use `@apply`.
- Outside `@layer base`, a global selector MUST only scope CSS variable overrides.
- The global stylesheet MUST order imports, `@custom-variant` definitions, `:root` variables and the selectors that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order.
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

Why: scoped token overrides are forbidden unless the token maps to its same-named runtime variable through `@theme inline`.

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

Why: the default value lives in `:root`, the theme changes that same variable, and `@theme inline` exposes a stable Tailwind utility.

## Incorrect — Scoped Radius Overrides a Fixed Token

```css
@theme {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}
```

Why: a direct `@theme` token cannot be overridden in a scoped selector; use a matching `:root` variable and `@theme inline` instead.

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

Why: the same-named variable provides the default and scoped values for the `rounded-card` utility without creating a second token name.

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

Why: `deep.css` is reachable from the entry only through `base.css`, so its project CSS does not arrive through the entry's direct import and is easy to miss.

## Correct — Project CSS Imported Directly by the Entry

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./theme.css";

/* src/app/styles/theme.css */
:root {
  --content-gap: 1rem;
}
```

```tsx
// src/app/layout.tsx
import "./styles/globals.css";
```

Why: the root layout imports the one global CSS entry point, and `theme.css` is a direct import of that entry point, so all project CSS arrives through one explicit door under `src/app/styles/`.

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
