# Theme and Utility Definition Rule

Project values need stable Tailwind names, while presentation reuse belongs to components. Custom utilities bridge values or properties into Tailwind; they are not reusable style bundles.

- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom `@utility` MUST NOT simply alias an existing Tailwind class.
- Tailwind color tokens MUST use semantic suffixes (`-canvas`, `-ink`, `-edge`), and color utilities MUST match those roles: canvas for backgrounds, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes.
- Non-color custom properties MUST use descriptive domain names and MUST NOT use the reserved color-role suffixes.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- A static custom `@utility` MUST use a name derived from its CSS property and value, including units.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- `@utility`, `@theme`, default `:root`, and `@keyframes` names MUST be unique within each category across project CSS, including within one file; scoped or conditional `:root` overrides are allowed.
- `@font-face` declarations MUST be unique by family, style, weight, stretch, and Unicode range; different faces of one family are allowed.
- Distinct `@theme` tokens and default `:root` properties MUST NOT share the same static CSS value.
- When Tailwind can generate an equivalent class from an available `@theme` token, that class MUST take precedence over custom `@utility` definitions and standalone CSS class selectors; define a theme token instead of a redundant one-property utility when supported.
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

Why: a literal color needs a direct `@theme` definition. Runtime overrides and self-named `@theme inline` mappings are covered by the global stylesheet rule.

## Incorrect — A Font List Outside `var()` Is Not Its Fallback

```css
@theme inline {
  --font-sans: var(--font-inter), Arial, sans-serif;
}
```

Why: if the injected `--font-inter` variable is missing, the unresolved `var()` invalidates the whole `font-family` declaration. `Arial` after the closing parenthesis is not a CSS variable fallback.

## Correct — Fallback Inside the External Font Reference

```css
@theme inline {
  --font-sans: var(--font-inter, Arial), sans-serif;
}
```

Why: the second argument of `var()` supplies `Arial` when `--font-inter` is unavailable; `sans-serif` remains the next family when the selected font is unavailable. This works with external variables injected by a font loader such as `next/font`.

## Incorrect — Theme Color Wrapped in a Custom Utility

```css
@utility border-control-edge {
  @apply [border-color:var(--color-control-edge)];
}
```

Why: the color token belongs in `@theme`, which already generates `border-control-edge` without a custom utility.

## Correct — A Theme-Generated Border Color

```css
@theme {
  --color-control-edge: #d1d5db;
}
```

Why: Tailwind generates `border-control-edge` directly from the static theme token; a `:root` bridge is unnecessary without runtime overrides.

## Incorrect — Complex Animation Hidden in a Custom Utility

```css
@utility animate-wiggle {
  @apply [animation:wiggle_2s_ease-in-out_infinite];
}
```

Why: Tailwind can generate the same single-property animation class from a theme variable, even though the value has several CSS tokens.

## Correct — Theme-Generated Animation

```css
@theme {
  --animate-wiggle: wiggle 2s ease-in-out infinite;
}

@keyframes wiggle {
  to {
    transform: rotate(3deg);
  }
}
```

Why: `animate-wiggle` is generated from `--animate-wiggle` and references the existing keyframes. Complex CSS values do not by themselves justify a custom `@utility`.

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
@utility grid-template-columns-2fr-1fr {
  grid-template-columns: 2fr 1fr;
}
```

Why: the raw declaration bypasses Pasika's `@apply` requirement; the corrected example keeps the same two-column grid.

## Correct — Arbitrary Property Mapped Through Tailwind

```css
@utility grid-template-columns-2fr-1fr {
  @apply [grid-template-columns:2fr_1fr];
}
```

Why: the class name reflects `grid-template-columns: 2fr 1fr`, and the arbitrary value stays in CSS rather than JSX.

## Incorrect — Custom Utility No Source Uses

```css
@utility border-style-outset {
  @apply [border-style:outset];
}
```

Why: no source file uses `border-style-outset`, so the mapping is dead.

## Correct — Custom Utility a Component Uses

```css
@utility border-style-outset {
  @apply [border-style:outset];
}
```

```tsx
<section className="border-style-outset">Settings</section>
```

Why: the component consumes a single-property utility with a property/value-derived name.

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
