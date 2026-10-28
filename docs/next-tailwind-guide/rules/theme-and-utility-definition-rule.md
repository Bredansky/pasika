# Theme and Utility Definition Rule

Project values need stable Tailwind names, while presentation reuse belongs to components. Custom utilities bridge values or properties into Tailwind; they are not reusable style bundles.

- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom `@utility` MUST NOT simply alias an existing Tailwind class.
- Tailwind color tokens MUST use semantic suffixes (`-canvas`, `-ink`, `-edge`), and color utilities MUST match those roles: canvas for backgrounds, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes.
- Non-color custom properties MUST use descriptive domain names and MUST NOT use the reserved color-role suffixes.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- The same custom `@utility` name MUST NOT be defined in two different CSS files. Components may reuse the utility as often as needed.
- Distinct Tailwind `@theme` tokens and default `:root` custom properties MUST NOT have the same static CSS value, even when declared in the same stylesheet or in different stylesheets. Equivalent hexadecimal color spellings count as identical values; conditional runtime overrides do not.
- A Tailwind `@theme` variable MUST NOT be defined in two different CSS files.
- A default `:root` custom property MUST NOT be defined in two different CSS files; intentional overrides in conditional at-rules or scoped selectors are allowed.
- The same `@keyframes` name MUST NOT be defined in two different CSS files.
- An `@font-face` with the same family, style, weight, stretch, and Unicode range MUST NOT be defined in two different CSS files; different faces of one family are allowed.
- A font-size or letter-spacing custom utility with a plain one-property mapping MUST use a theme token instead; an explicitly configured Tailwind typography class MUST be reused when its emitted styling operations and value are identical.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

## Incorrect — Background Using a Text Color

```css
@theme {
  --color-shiny-ink: #ffffff;
}
```

```tsx
<div className="bg-shiny-ink" />
```

Why: a text-color token is being applied as a background, even though Tailwind generates the class.

## Correct — Background Using a Canvas Color

```css
@theme {
  --color-shiny-canvas: #2563eb;
}
```

```tsx
<div className="bg-shiny-canvas" />
```

Why: the canvas suffix identifies a background color and Pasika verifies that the utility uses it accordingly.

## Incorrect — Direct Theme Value Marked Inline

```css
@theme inline {
  --color-primary-canvas: #18181b;
}
```

Why: a literal token value does not need inline variable resolution and belongs in regular `@theme`.

## Correct — Literal Color Token Declared Directly

```css
@theme {
  --color-primary-canvas: #18181b;
}
```

Why: a fixed color can be declared directly in `@theme`; colors that change with the active theme instead use runtime variables and `@theme inline`.

## Incorrect — Runtime Variable Without Inline

```css
:root {
  --color-primary-canvas: #18181b;
}

@theme {
  --color-primary-canvas: var(--color-primary-canvas);
}
```

Why: an indirect theme token without `inline` can resolve its source variable outside the scope where the utility is used.

## Correct — Runtime Color Variable Mapped Inline

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

Why: `bg-primary-canvas` resolves the same-named runtime variable, which has a light default and a dark-theme override.

## Incorrect — Raw Property Inside a Custom Utility

```css
@utility border-control-edge {
  border-color: var(--control-edge);
}
```

Why: project styling inside `@utility` must use Tailwind's `@apply` mapping.

## Correct — A Property-Specific Utility

```css
:root {
  --control-edge: #d1d5db;
}

@utility border-control-edge {
  @apply border-(color:--control-edge);
}
```

Why: the utility maps a single border-color operation, while `edge` identifies the color's boundary role.

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
@utility full-width {
  @apply w-full;
}
```

Why: `w-full` already expresses this operation, so a custom alias adds no value.

## Correct — Reuse the Existing Utility Directly

```tsx
<div className="w-full" />
```

Why: use the built-in utility directly instead of creating an alias.

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
  @apply text-(color:--header-ink);
}
```

Why: no component or stylesheet references `text-header-ink`, so the mapping is dead.

## Correct — Custom Utility a Component Uses

```css
:root {
  --header-ink: #111827;
}

@utility text-header-ink {
  @apply text-(color:--header-ink);
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

## Correct — Semantic Color Defined in the Theme

```css
@theme {
  --color-danger-canvas: #ef4444;
  --color-danger-ink: #ffffff;
}
```

```tsx
<button className="bg-danger-canvas text-danger-ink">Delete</button>
```

Why: explicit semantic tokens generate available color utilities after the default palette is reset.

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
@theme {
  --text-sm: 14px;
}
```

Why: reuse `text-sm` instead of registering a second token for the same value; sizes with different units or additional line-height and letter-spacing remain distinct.
