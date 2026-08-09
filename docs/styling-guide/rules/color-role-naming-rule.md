# Color Role Naming Rule

Color names should reveal what a utility is safe to do, while keeping broadly reusable colors pleasant to use. This rule makes background-only colors, readable text colors, and complete treatments distinct without adding ceremony to general-purpose colors.

- A color that is intentionally reusable across background, text, border, ring, or other CSS properties MUST use its role name without a property suffix.
- A color intended only for a background MUST use the `-canvas` suffix, and a color intended only for readable text MUST use the `-ink` suffix.
- `base-canvas` and `base-ink` MUST be applied only by the document body or the project's global base layer as the default page pair.
- A repeated background, foreground, and related treatment MUST become a `surface-*` custom utility that owns the complete treatment.
- A project with runtime-selectable themes SHOULD map `:root` variables into `@theme` tokens so Tailwind utilities remain stable while values change.
- A one-off background MAY use a `*-canvas` utility directly when it does not form a repeated named surface.

## Incorrect

```css
@theme {
  --color-primary-background: var(--primary-background);
  --color-primary-text: var(--primary-text);
}
```

```tsx
<main className="bg-page text-page-text" />
<button className="bg-primary-background text-primary-text">Save</button>
```

Why: the names are inconsistent, the document defaults can be applied anywhere, and the repeated button treatment has no single owner.

## Correct

```css
:root {
  --base-canvas: #ffffff;
  --base-ink: #111827;
  --primary: #d87943;
  --primary-canvas: #d87943;
  --primary-ink: #ffffff;
}

@theme {
  --color-base-canvas: var(--base-canvas);
  --color-base-ink: var(--base-ink);
  --color-primary: var(--primary);
  --color-primary-canvas: var(--primary-canvas);
  --color-primary-ink: var(--primary-ink);
}

@utility surface-primary {
  background-color: var(--primary-canvas);
  color: var(--primary-ink);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);

  &:hover {
    filter: brightness(1.05);
  }
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}
```

```tsx
// `primary` is useful for more than one CSS property.
<a className="text-primary" />
<button className="surface-primary">Save</button>

// This background is a one-off rather than a named surface.
<aside className="bg-primary-canvas text-primary-ink" />
```

Why: general-purpose colors stay suffix-free, property-specific colors reveal their role, the page defaults have one owner, and the reusable primary treatment owns its colors and behavior together.
