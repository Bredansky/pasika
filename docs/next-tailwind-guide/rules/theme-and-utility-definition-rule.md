# Theme and Utility Definition Rule

Project values need stable Tailwind names, while presentation reuse belongs to components. Custom utilities bridge values or properties into Tailwind; they are not reusable style bundles.

- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom `@utility` MUST NOT simply alias an existing Tailwind class.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- The same custom `@utility` name MUST NOT be defined in two different CSS files. Components may reuse the utility as often as needed.
- A Tailwind `@theme` variable MUST NOT be defined in two different CSS files.
- A default `:root` custom property MUST NOT be defined in two different CSS files; intentional overrides in conditional at-rules or scoped selectors are allowed.
- The same `@keyframes` name MUST NOT be defined in two different CSS files.
- An `@font-face` with the same family, style, weight, stretch, and Unicode range MUST NOT be defined in two different CSS files; different faces of one family are allowed.
- A font-size or letter-spacing custom utility with a plain one-property mapping MUST use a theme token instead; an explicitly configured Tailwind typography class MUST be reused when its emitted styling operations and value are identical.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

## Incorrect — Direct Theme Value Marked Inline

```css
@theme inline {
  --color-button-canvas: #18181b;
}
```

Why: a literal token value does not need inline variable resolution and belongs in regular `@theme`.

## Correct — Scoped Overrides of One Theme Token

```css
@theme {
  --color-button-canvas: #18181b;
}

[data-theme="light"] {
  --color-button-canvas: #fafafa;
}

@media (prefers-color-scheme: dark) {
  [data-theme="system"] {
    --color-button-canvas: #18181b;
  }
}
```

Why: Tailwind registers one `bg-button-canvas` utility that reads `--color-button-canvas`; the theme-specific selectors override that token directly.

## Incorrect — Runtime Variable Without Inline

```css
:root {
  --button-canvas: #18181b;
}

@theme {
  --color-button-canvas: var(--button-canvas);
}
```

Why: an indirect theme token without `inline` can resolve its source variable outside the scope where the utility is used.

## Correct — Runtime Variable Mapped Inline

```css
:root {
  --button-canvas: #18181b;
}

.dark {
  --button-canvas: #fafafa;
}

@theme inline {
  --color-button-canvas: var(--button-canvas);
}
```

Why: Tailwind emits `bg-button-canvas` using the runtime variable directly, so a scoped override changes the active color without requiring any particular theme selector.

## Incorrect — Raw Property Inside a Custom Utility

```css
@utility border-button-outline {
  border-color: var(--button-border-color);
}
```

Why: project styling inside `@utility` must use Tailwind's `@apply` mapping.

## Correct — A Property-Specific Utility

```css
:root {
  --button-border-color: #d1d5db;
}

@utility border-button-outline {
  @apply border-(--button-border-color);
}
```

Why: the explicit `border-*` utility limits the mapping to the intended property, without imposing a particular semantic naming suffix.

## Incorrect — Typography Size Hidden in Custom Utility

```css
@utility text-card-title {
  @apply [font-size:0.875rem];
}
```

Why: a simple font-size mapping belongs in Tailwind's `--text-*` theme namespace.

## Correct — A Descriptive Typography Token

```css
@theme {
  --text-card-title: 0.875rem;
}
```

Why: a direct theme value requires no extra `:root` variable, and the Tailwind typography namespace determines the generated utility.

## Incorrect — Utility Only Renames Another Class

```css
@utility bg-mc-button {
  @apply bg-gray-500;
}
```

Why: a custom utility that only applies one ordinary Tailwind class is an unnecessary alias that adds no styling operation. The referenced class must still exist in the project's theme, particularly when the default palette is reset.

## Correct — Reuse the Existing Utility Directly

```tsx
<button className="bg-gray-500">Play</button>
```

Why: use the underlying utility where it is needed, provided `--color-gray-500` is configured. Keep custom `@utility` definitions for property-specific or variable-backed values that cannot be expressed directly with an existing named class.

## Incorrect — Reusable Presentation Hidden in a Utility

```css
@utility primary-action {
  @apply bg-primary-canvas text-primary-ink rounded-md px-4;
}
```

```tsx
<button className="primary-action">Save</button>
<button className="primary-action">Continue</button>
```

Why: the utility bundles presentation only to reuse it across UI instances.

## Correct — Reusable Presentation Owned by a Component

```tsx
export function PrimaryButton(props: React.ComponentProps<"button">): React.JSX.Element {
  return <button className="bg-primary-canvas text-primary-ink rounded-md px-4" {...props} />;
}

<PrimaryButton>Save</PrimaryButton>
<PrimaryButton>Continue</PrimaryButton>
```

Why: the component owns the reusable presentation and its markup/API, while mapping utilities remain property-specific.

## Incorrect — Arbitrary Property Written as Raw CSS

```css
@utility content-grid {
  grid-template-columns: 2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px);
}
```

Why: project styling inside a custom utility bypasses Tailwind instead of going through `@apply`.

## Correct — Arbitrary Property Mapped Through Tailwind

```css
@utility content-grid {
  @apply [grid-template-columns:2fr_max(0,var(--gutter-width))_calc(var(--gutter-width)+10px)];
}
```

Why: the custom utility maps one otherwise unnamed property value through Tailwind without becoming a reusable style bundle.

## Incorrect — Custom Utility No Source Uses

```css
@utility text-header-ink {
  @apply text-(--header-ink);
}
```

Why: no component or stylesheet references `text-header-ink`, so the mapping is dead.

## Correct — Custom Utility a Component Uses

```css
@utility text-header-ink {
  @apply text-(--header-ink);
}
```

```tsx
<h1 className="text-header-ink">Settings</h1>
```

Why: the component consumes the mapping utility, so it has a live purpose.

## Incorrect — Component References a Nonexistent Utility

```tsx
<button className="bg-primay-canvas text-primary-ink">Save</button>
```

Why: `bg-primay-canvas` is a typo — no theme variable or custom utility generates it.

## Correct — Component References Utilities That Exist

```tsx
<button className="bg-primary-canvas text-primary-ink">Save</button>
```

Why: both utilities are part of the project's Tailwind API.

## Incorrect — Built-in Default After the Theme Reset

```tsx
<button className="bg-red-500">Delete</button>
```

Why: the global stylesheet resets Tailwind's default theme with `--*: initial`, so `--color-red-500` does not exist and `bg-red-500` generates nothing.

## Correct — Built-in Default Re-Declared in the Theme

```css
@theme {
  --color-red-500: #ef4444;
}
```

```tsx
<button className="bg-red-500">Delete</button>
```

Why: re-declaring `--color-red-500` in the project theme turns `bg-red-500` into a theme-generated utility again.

## Incorrect — Font Size Hidden in a Custom Utility

```css
@utility text-retro-11 {
  @apply [font-size:11px];
}
```

Why: this single font-size mapping duplicates the utility generation already available through the Tailwind text theme namespace.

## Correct — Font Size Owned by a Theme Token

```css
:root {
  --retro-11-text-size: 11px;
}

@theme inline {
  --text-retro-11: var(--retro-11-text-size);
}
```

Why: Tailwind generates `text-retro-11` directly from the named theme token.

## Incorrect — Duplicate Configured Typography Utility

```css
@theme {
  --text-sm: 14px;
  --text-retro-14: 14px;
}
```

Why: both classes emit the same font-size with no additional styling, so the alias adds no capability.

## Correct — Reuse an Equivalent Typography Utility

```css
:root {
  --compact-text-size: 14px;
}

@theme inline {
  --text-sm: var(--compact-text-size);
}
```

Why: `text-sm` expresses the existing configured size without a redundant alias; sizes with different units or additional line-height and letter-spacing remain distinct.
