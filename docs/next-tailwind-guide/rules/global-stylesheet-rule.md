# Global Stylesheet Rule

Scattered stylesheets and competing Tailwind entry points obscure CSS ownership and ordering. A single entry point keeps imports and global defaults predictable.

- Project stylesheets MUST live under `src/app/styles/`, with `globals.css` as the sole Tailwind entry point.
- Other than `globals.css`, a project stylesheet MUST be named `<feature>.css` for an existing `src/features/<feature>/` directory and live directly under `src/app/styles/`.
- The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.
- CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial` in `globals.css`, using either `@theme` or `@theme inline`, before importing feature stylesheets; feature stylesheets MUST NOT declare that reset.
- Global selectors inside `@layer base` MUST contain only `@apply` directives.
- The global stylesheet entry point MUST order imports, `@custom-variant` definitions, `:root` variables and selectors or conditions that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order, except for an isolated `--*: initial` theme reset immediately after the Tailwind import.
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

## Incorrect — Theme Reset After Feature Imports

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./home.css";
@theme {
  --*: initial;
}

/* src/app/styles/home.css */
@theme {
  --color-home-canvas: #123456;
}
```

Why: resetting theme variables after importing `home.css` removes the feature's theme token and prevents Tailwind from generating its `bg-home-canvas` utility. The reset must come between the Tailwind import and feature imports.

## Incorrect — Theme Reset Inside a Feature Stylesheet

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./home.css";

/* src/app/styles/home.css */
@theme {
  --*: initial;
  --color-home-canvas: #123456;
}
```

Why: the project-wide reset belongs exclusively in `globals.css`. A feature stylesheet may define its own tokens but must not reset the shared Tailwind theme.

## Correct — Reset Before Feature Theme Tokens

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@theme {
  --*: initial;
}
@import "./home.css";

/* src/app/styles/home.css */
@theme {
  --color-home-canvas: #123456;
}
```

Why: Tailwind processes the reset before the feature stylesheet, preserving `--color-home-canvas` and its generated `bg-home-canvas` utility.

## Correct — Feature Theme Without a Reset

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@theme {
  --*: initial;
}
@import "./home.css";

/* src/app/styles/home.css */
@theme {
  --color-home-canvas: #123456;
}
```

Why: the global stylesheet resets Tailwind once before importing feature tokens, and the feature stylesheet only adds its own theme variables.

## Correct — Project CSS Imported Directly by the Entry

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@theme {
  --*: initial;
}
@import "./home.css";

/* src/app/styles/home.css */
@theme {
  --color-home-canvas: #123456;
}
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

Why: the root layout imports one global CSS entry point, which resets Tailwind before importing a feature stylesheet directly. The imported `--color-home-canvas` token survives and generates its utilities; shared CSS stays in `globals.css`.

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
