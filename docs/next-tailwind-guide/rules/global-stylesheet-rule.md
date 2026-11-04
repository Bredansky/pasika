# Global Stylesheet Rule

Scattered stylesheets and competing Tailwind entry points obscure CSS ownership and ordering. A single entry point keeps imports and global defaults predictable.

- Project stylesheets MUST live under `src/app/styles/`, with `globals.css` as the sole Tailwind entry point.
- Other than `globals.css`, a project stylesheet MUST be named `<feature>.css` for an existing `src/features/<feature>/` directory and live directly under `src/app/styles/`.
- The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.
- CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial` in `@theme inline` in `globals.css`, before importing feature stylesheets; feature stylesheets MUST NOT declare that reset.
- Each project stylesheet MUST contain at most one `@theme inline` block.
- Global selectors inside `@layer base` MUST contain only `@apply` directives.
- The global stylesheet entry point MUST order the Tailwind import, one `@theme inline` block containing `--*: initial` as its first declaration and all global tokens, feature stylesheet imports, `@custom-variant` definitions, `:root` variables and `@variant` overrides, custom utilities, base styles, and keyframes.
- Adjacent top-level CSS `@` directives MUST have a blank line between them, except consecutive `@import` directives.
- The global base layer MUST apply `base-canvas` and `base-ink` to the document body as the default page pair.

## Incorrect — Adjacent At-Rules Without a Blank Line

```css
@theme inline {
  --color-base-canvas: white;
}
@utility clip-path-trapezoid {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}
```

Why: two top-level directives run together without the required visual separator.

## Correct — At-Rules Separated, Imports Grouped

```css
@import "tailwindcss";

@theme inline {
  --*: initial;
  --color-base-canvas: white;
}

@import "./home.css";
@import "./player.css";

@utility clip-path-trapezoid {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}
```

Why: each top-level section has a blank line before the next one; consecutive imports may stay grouped.

## Incorrect — Competing Global Stylesheet Entry Points

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme inline {
  --spacing: 0.25rem;
}

/* src/app/styles/editor.css */
@import "tailwindcss";

@theme inline {
  --font-editor: Georgia, serif;
}
```

Why: Tailwind and theme definitions are split across competing global entry points, so neither file clearly owns the system.

## Correct — One Global Stylesheet Owns the System

```css
@import "tailwindcss";

@theme inline {
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

Why: a single global `@theme inline` block resets Tailwind and defines shared tokens; the base layer then applies the generated utilities.

## Incorrect — Global Theme Split Around Feature Imports

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme inline {
  --*: initial;
}

@import "./home.css";

@theme inline {
  --radius-base: 8px;
  --color-base-canvas: #ffffff;
}
```

Why: placing feature imports between the reset and global tokens splits the global theme into two blocks. Keep the reset and all shared tokens together before feature imports.

## Correct — Reset and Shared Tokens in One Inline Block

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme inline {
  --*: initial;

  /* Fixed */
  --radius-base: 8px;
  --color-base-canvas: #f8fafc;

  /* Variant-driven */
  --color-primary-canvas: var(--color-primary-canvas);

  /* External provider */
  --font-sans: var(--font-inter, Arial);
}

@import "./home.css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  --color-primary-canvas: #ffffff;

  @variant dark {
    --color-primary-canvas: #18181b;
  }
}
```

Why: one block groups the reset with fixed, variant-driven, and fallback-backed external tokens, while feature styles add their own `@theme inline` tokens without a reset. Tailwind [inlines CSS imports at build time](https://tailwindcss.com/docs/functions-and-directives#import), so the compiled browser CSS does not retain the `@import` after the theme block.

## Incorrect — Project CSS Reached Only Through a Midpoint

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme inline {
  --*: initial;
}

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

@theme inline {
  --*: initial;
}

@import "./home.css";
@import "./player.css";
```

```tsx
// src/app/layout.tsx
import "./styles/globals.css";
```

Why: the root layout imports the sole Tailwind entry point, which directly imports each feature stylesheet rather than relying on an intermediary.

## Incorrect — Theme Reset After Feature Imports

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
@import "./home.css";
@theme inline {
  --*: initial;
}

/* src/app/styles/home.css */
@theme inline {
  --color-home-canvas: #123456;
}
```

Why: resetting theme variables after importing `home.css` removes the feature's theme token and prevents Tailwind from generating its `bg-home-canvas` utility. The reset must come between the Tailwind import and feature imports.

## Correct — Reset Before Feature Theme Tokens

```css
/* src/app/styles/globals.css */
@import "tailwindcss";

@theme inline {
  --*: initial;
  --color-base-canvas: #ffffff;
}

@import "./home.css";

/* src/app/styles/home.css */
@theme inline {
  --color-home-canvas: #123456;
}
```

Why: the single global theme block resets Tailwind and defines shared tokens before importing the feature stylesheet.

## Incorrect — Theme Reset Inside a Feature Stylesheet

```css
/* src/app/styles/home.css */
@theme inline {
  --*: initial;
  --color-home-canvas: #123456;
}
```

Why: a feature stylesheet must not reset the shared Tailwind theme, even when `globals.css` has already reset it.

## Correct — Feature Theme Without a Reset

```css
/* src/app/styles/home.css */
@theme inline {
  --color-home-canvas: #123456;
}
```

Why: feature stylesheets contribute their own tokens without resetting the global theme.

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
