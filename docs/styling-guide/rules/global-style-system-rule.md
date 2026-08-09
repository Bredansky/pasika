# Global Style System Rule

Global CSS is the integration point for a repository's theme values and styles that components cannot own directly. This rule keeps it readable and prevents competing sources of truth.

- A repository MUST have one active global stylesheet that owns theme registration and imports the global style domains it uses.
- Theme values MUST be defined in documented selectors such as `:root` or a theme selector and mapped into Tailwind through `@theme` when Tailwind utilities consume them.
- A repository SHOULD keep global CSS ordered as imports, Tailwind/theme registration, theme selectors, base styles, keyframes and custom utilities, then unavoidable global selectors.
- A repository SHOULD keep product-specific theme modes, fonts, motion, effects, and content exceptions in a local theme contract when they need documentation.
- Global selectors MAY target third-party markup, rich content, pseudo-element-heavy effects, document state, and browser behavior that controlled JSX cannot own.

## Incorrect

```css
/* Component recipes and theme values are scattered across unrelated files. */
.save-button { background: #7c3aed; }

@theme {
  --color-primary: #7c3aed;
}
```

Why: the button duplicates a theme value in a global selector, and the stylesheet does not establish a clear ownership order.

## Correct

```css
@import "tailwindcss";

@theme {
  --color-primary: var(--primary);
}

:root {
  --primary: #7c3aed;
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}

@utility surface-primary {
  background-color: var(--primary);
}

/* Third-party markup is not controlled by component JSX. */
.external-player .controls { display: none; }
```

Why: theme values, base defaults, custom utilities, and unavoidable external selectors each have an explicit global owner.
