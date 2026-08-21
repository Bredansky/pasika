# Global Stylesheet Rule

Use the global stylesheet to define Tailwind, the shared theme, and base styles. This rule keeps all of the project's global CSS in one entry point and ordered predictably.

- A repository MUST have one global stylesheet entry point that registers Tailwind.
- The project's global CSS MUST live in the global stylesheet entry point and MUST NOT be imported from another file.
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
