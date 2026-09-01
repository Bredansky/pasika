# Global Stylesheet Rule

Use the global stylesheet to define Tailwind, the shared theme, and base styles. This rule keeps all of the project's global CSS in one entry point and ordered predictably.

- A repository MUST have one global stylesheet entry point that registers Tailwind.
- The global stylesheet entry point MUST be imported by exactly one module (the root layout), every other stylesheet MUST be reachable from it via `@import`, and one holding project CSS MUST be imported by the entry point directly.
- The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
- Every value used for the project's styling MUST be defined as a CSS variable in `:root`, even when no theme selector overrides it. A Tailwind theme variable MUST reference that CSS variable through `@theme inline`.
- Style declarations added by the project inside global selectors MUST use `@apply`.
- The global stylesheet MUST order imports, `@custom-variant` definitions, `:root` variables and the selectors that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order.
- The global base layer MUST apply `base-canvas` and `base-ink` to the document body as the default page pair.

## Incorrect — Global Styles Split Across Unrelated Files

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --spacing: 0.25rem;
}

/* editor.css */
@import "tailwindcss";

@theme {
  --font-editor: Georgia, serif;
}
```

Why: Tailwind and theme definitions are split across competing global entry points, so neither file clearly owns the system.

## Incorrect — Project CSS Reached Only Through a Midpoint

```css
/* globals.css */
@import "tailwindcss";
@import "./base.css";

/* base.css — import-only shim */
@import "./deep.css";

/* deep.css */
:root {
  --spacing: 0.25rem;
}
```

Why: `deep.css` is reachable from the entry only through `base.css`, so its project CSS does not arrive through the entry's direct import and is easy to miss.

## Correct — Project CSS Imported Directly by the Entry

```css
/* globals.css */
@import "tailwindcss";
@import "./theme.css";

/* theme.css */
:root {
  --spacing: 0.25rem;
}
```

Why: `theme.css` is a direct import of the entry point, so the project CSS it defines clearly belongs to the one global stylesheet.

## Correct — One Global Stylesheet Owns the System

```css
@import "tailwindcss";

:root {
  --spacing: 0.25rem;
  --base-canvas: #ffffff;
  --base-ink: #111827;
}

@theme {
  --*: initial;
}

@theme inline {
  --spacing: var(--spacing);
}

@utility bg-base-canvas {
  @apply bg-(--base-canvas);
}

@utility text-base-ink {
  @apply text-(--base-ink);
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

Why: one entry point registers Tailwind, defines the shared system, and applies document defaults in a predictable order.
