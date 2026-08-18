# Color Role Naming Rule

Color names in the project's Tailwind CSS should show which CSS properties a utility is intended for. This rule separates general-purpose colors, background-only colors, readable text colors, and reusable surface treatments.

- A color reusable across background, text, border, ring, or other CSS properties MUST be registered as a `--color-<role>` Tailwind theme color without a property suffix.
- A CSS variable intended only for a background MUST be named `--<role>-canvas`, and one intended only for readable text MUST be named `--<role>-ink`.
- A repeated combination of canvas, ink, and related styles MUST become a `*-surface` custom Tailwind utility that owns the combination.
- A `--<role>-canvas` or `--<role>-ink` CSS variable MUST NOT be registered as a Tailwind theme color. When it is needed outside a `*-surface` utility, a matching `bg-<role>-canvas` or `text-<role>-ink` custom Tailwind utility class MUST expose it.

## Incorrect — Property-Specific Colors Exposed Broadly

```css
@theme {
  --color-primary-canvas: #d87943;
  --color-primary-ink: #ffffff;
}
```

```tsx
<button className="bg-primary-canvas text-primary-ink">Save</button>
<button className="bg-primary-canvas text-primary-ink">Continue</button>
```

Why: property-specific colors are exposed as broad Tailwind colors, and the repeated combination has no named owner.

## Correct — Color Roles Expose Their Intended API

```css
:root {
  --primary-canvas: #d87943;
  --primary-ink: #ffffff;
}

@utility primary-surface {
  @apply bg-(--primary-canvas) text-(--primary-ink);
}
```

```tsx
<button className="primary-surface">Save</button>
```

Why: canvas and ink CSS variables are used only by `primary-surface`, and the repeated combination has one named owner.
