# Global Stylesheet Rule

Scattered project stylesheets and competing Tailwind entry points make CSS ownership, global defaults, and styling dependencies difficult to trace. A single, predictable stylesheet import tree prevents these inconsistencies as project CSS grows.

- A repository MUST have one global stylesheet entry point that registers Tailwind.
- Project stylesheets MUST live under `src/app/styles/`, and the global stylesheet entry point MUST be `src/app/styles/globals.css`.
- The global stylesheet entry point MUST be imported by exactly one module (the root layout). Project CSS MAY live in that entry point; every other stylesheet MUST be reachable from it via `@import`, and any other stylesheet holding project CSS MUST be imported by the entry point directly.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
- A Tailwind token without `var()` in its value MUST be declared in `@theme`.
- A Tailwind token with `var()` in its value MUST be declared in `@theme inline`.
- A token defined in `@theme` MUST NOT be defined again in the default `:root`. Theme-specific selectors or conditions such as `@media` MAY override it.
- Style declarations added by the project inside global selectors MUST use `@apply`.
- Outside `@layer base`, a global selector MUST only scope CSS variable overrides.
- The global stylesheet MUST order imports, `@custom-variant` definitions, `:root` variables and the selectors that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order.
- The global base layer MUST apply `base-canvas` and `base-ink` to the document body as the default page pair.

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
  --spacing: 0.25rem;
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
  --spacing: 0.25rem;
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
  --accent-canvas: #ffffff;
}

.dark {
  --accent-canvas: #111827;
}

@theme {
  --*: initial;
  --spacing: 0.25rem;
  --color-base-canvas: #ffffff;
  --color-base-ink: #111827;
}

@theme inline {
  --color-accent-canvas: var(--accent-canvas);
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

Why: one entry point owns both theme blocks; direct and variable-backed tokens are declared separately without duplicating token names.
