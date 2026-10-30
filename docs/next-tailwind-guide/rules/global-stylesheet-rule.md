# Global Stylesheet Rule

Scattered project stylesheets and competing Tailwind entry points make CSS ownership, global defaults, and styling dependencies difficult to trace. A single, predictable stylesheet import tree prevents these inconsistencies as project CSS grows.

- Project stylesheets MUST live under `src/app/styles/`, with `globals.css` as the sole Tailwind entry point.
- The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.
- CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.
- The global stylesheet import tree MUST reset Tailwind's default theme with `--*: initial` in either `@theme` or `@theme inline`.
- Tailwind tokens MUST use either `@theme` with direct values or `@theme inline` with `var()` references, consistently across the entire project.
- Tokens defined in plain `@theme` MUST NOT be redeclared outside `@theme`.
- A CSS variable referenced by an `@theme inline` token with the same name MUST have a default `:root` declaration and at least one scoped, conditional, or programmatic override.
- An `@theme inline` token MUST reference a same-named CSS variable, except `--font-*` tokens referencing external `--font-*` variables with a nonempty `var()` fallback.
- Global selectors inside `@layer base` MUST contain only `@apply` directives.
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

Why: Direct `@theme` tokens are intended to remain fixed. Values that change by theme should use runtime CSS variables mapped through `@theme inline`.

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

Why: A fixed `@theme` token should not be overridden by a scoped selector. Use a runtime CSS variable and a matching `@theme inline` mapping for scoped values.

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

Why: the matching `:root` default and scoped override provide runtime values for `rounded-card`. Without an override, this mapping adds unnecessary indirection; define `--radius-card: 8px` directly in `@theme` instead.

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
@utility border-style-outset {
  @apply [border-style:outset];
}
```

```tsx
// src/app/layout.tsx
import "./styles/globals.css";
```

```tsx
// src/app/page.tsx
export default function Home() {
  return <section className="border-style-outset">Home</section>;
}
```

Why: the root layout imports the single CSS entry point, which imports the feature stylesheet directly. The feature uses its custom utility, while shared tokens and base styles may stay in `globals.css`.

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

@theme inline {
  --*: initial;
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

Why: `@theme inline` both resets Tailwind defaults and maps theme-dependent colors to runtime CSS variables with light defaults and scoped dark overrides; no separate `@theme` block is needed.
