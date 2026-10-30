# Global Stylesheet Rule

Scattered stylesheets and competing Tailwind entry points obscure CSS ownership and ordering. A single entry point keeps imports and global defaults predictable.

- Project stylesheets MUST live under `src/app/styles/`, with `globals.css` as the sole Tailwind entry point.
- The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.
- CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.
- The global stylesheet import tree MUST reset Tailwind's default theme with `--*: initial` in either `@theme` or `@theme inline`.
- Global selectors inside `@layer base` MUST contain only `@apply` directives.
- The global stylesheet entry point MUST order imports, `@custom-variant` definitions, `:root` variables and selectors or conditions that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order.
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
@keyframes home-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

```tsx
// src/app/layout.tsx
import "./styles/globals.css";
```

Why: the root layout imports one global CSS entry point, which imports the feature stylesheet directly. Shared CSS stays in `globals.css`, and feature-specific definitions stay in their own stylesheet.

## Incorrect — Direct Declarations Inside the Base Layer

```css
@layer base {
  body {
    --color-base-canvas: blue;
    background-color: blue;
  }
}
```

Why: inside `@layer base`, global selectors may only use `@apply`. Define runtime CSS variables in `:root` and scoped overrides outside the base layer; apply base styling through Tailwind utilities.

## Correct — Base Layer Uses Only Tailwind Utilities

```css
@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

Why: the base layer applies Tailwind utilities rather than declaring CSS properties or variables; runtime values are defined outside this layer.

## Correct — One Global Stylesheet Owns the System

```css
@import "tailwindcss";

@theme {
  --*: initial;
  --color-base-canvas: #ffffff;
  --color-base-ink: #18181b;
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

Why: one entry point registers Tailwind, resets the default theme, defines the page colors, and applies global base styling. Token mappings and runtime overrides are covered by the theme and utility definition rule.
