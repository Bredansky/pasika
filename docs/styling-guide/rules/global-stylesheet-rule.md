# Global Stylesheet Rule

Use the global stylesheet to define Tailwind, the shared theme, and base styles. This rule keeps all project-owned global CSS in one entry point and ordered predictably.

- A repository MUST have one global stylesheet entry point that registers Tailwind.
- Project-owned global CSS MUST live in the global stylesheet entry point and MUST NOT be imported from another file.
- Every regular project-owned CSS variable in the global stylesheet MUST be defined in `:root`, even when no theme selector overrides it.
- The global stylesheet MUST order imports, `@custom-variant` definitions, theme variables and the selectors that change them, custom utilities, base styles, and keyframes in that order.
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

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --*: initial;
  --spacing: 0.25rem;
}

:root {
  --base-canvas: #ffffff;
  --base-ink: #111827;
}

.dark {
  --base-canvas: #111827;
  --base-ink: #ffffff;
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
