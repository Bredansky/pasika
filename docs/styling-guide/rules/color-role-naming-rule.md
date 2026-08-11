# Color Role Naming Rule

Color names should reveal what a utility is safe to do, while keeping broadly reusable colors pleasant to use. This rule makes background-only colors, readable text colors, and complete treatments distinct without adding ceremony to general-purpose colors.

- A color that is intentionally reusable across background, text, border, ring, or other CSS properties MUST use its role name without a property suffix.
- A color intended only for a background MUST use the `-canvas` suffix, and a color intended only for readable text MUST use the `-ink` suffix.
- A `*-canvas` or `*-ink` value MUST remain a private CSS variable and be exposed only through its matching property-specific custom utility.
- `base-canvas` and `base-ink` MUST be applied only by the document body or the project's global base layer as the default page pair.
- A repeated canvas, ink, and related treatment MUST become a `surface-*` custom utility that owns the complete treatment.
- A general-purpose color backed by runtime-selectable theme variables MUST use `@theme inline` so Tailwind utilities remain stable while values change.
- A one-off background MAY use a `*-canvas` utility directly when it does not form a repeated named surface.

## Incorrect

```css
@theme {
  --color-primary-background: #d87943;
  --color-primary-text: #ffffff;
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

.dark {
  --base-canvas: #111827;
  --base-ink: #f9fafb;
  --primary: #f1a06e;
  --primary-canvas: #f1a06e;
  --primary-ink: #111827;
}

@theme {
  --*: initial;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.15);
}

@theme inline {
  --color-primary: var(--primary);
}

@utility bg-base-canvas {
  @apply bg-(--base-canvas);
}

@utility text-base-ink {
  @apply text-(--base-ink);
}

@utility bg-primary-canvas {
  @apply bg-(--primary-canvas);
}

@utility text-primary-ink {
  @apply text-(--primary-ink);
}

@utility surface-primary {
  @apply bg-primary-canvas text-primary-ink shadow-sm;

  &:hover {
    @apply brightness-105;
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

## Promotion Path

Promote styling only as its reuse or design meaning grows:

```txt
Tailwind utility -> theme color -> paired color -> surface utility -> component variant
```

## When To Create a Named Surface

Create a named `surface-*` utility when one or more of these signals applies:

- The combination repeats in multiple places.
- The combination has a clear product or design meaning.
- Designers refer to the combination as a named treatment.
- The combination needs to stay consistent across components.
- The treatment includes more than color, such as a border, hover state, or shadow.
