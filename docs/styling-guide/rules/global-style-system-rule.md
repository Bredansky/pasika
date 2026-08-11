# Global Style System Rule

Global CSS is the integration point for Tailwind registration, the project theme, base styles, and imported style domains. This rule keeps one active entry point and a predictable ownership order.

- A repository MUST have one active global stylesheet that owns Tailwind registration and imports every global style domain it uses.
- The global stylesheet MUST reset the default Tailwind theme and register the project's explicit theme values.
- Static theme values MUST live directly in `@theme`, while selector-driven variable mappings MUST live in `@theme inline`.
- Global CSS MUST be ordered as imports, Tailwind and custom-variant registration, theme definitions and selectors, custom utilities, base styles, keyframes, then unavoidable global selectors.
- Imported global style domains MUST have one owner and MUST NOT duplicate theme values or utilities defined by another domain.

## Incorrect

```css
/* Theme values and component recipes compete across unrelated files. */
.save-button {
  @apply bg-primary;
}

@theme {
  --color-primary: #7c3aed;
}
```

Why: a component recipe sits globally beside an unreset theme, and the stylesheet does not establish a clear integration order.

## Correct

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

Why: one entry point registers Tailwind, resets the theme, defines selector-driven values, exposes intended utilities, and applies document defaults in a predictable order.
