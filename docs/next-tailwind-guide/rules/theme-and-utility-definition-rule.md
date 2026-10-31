# Theme and Utility Definition Rule

Theme tokens and custom utilities can overlap, making the styling API harder to maintain. Stable token names and single-operation utilities prevent redundant definitions while components own reusable presentation.

- Tailwind tokens MUST consistently use either plain `@theme` for fixed values (including aliases to fixed theme tokens), or `@theme inline` for runtime CSS-variable references.
- Tokens defined in plain `@theme` MUST NOT be redeclared outside `@theme`.
- A CSS variable referenced by an `@theme inline` token with the same name MUST have a default `:root` declaration and at least one scoped, conditional, or programmatic override.
- An `@theme inline` token MUST reference a same-named CSS variable, except `--font-*` tokens referencing external `--font-*` variables with a nonempty `var()` fallback.
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
- When Tailwind supports a theme-generated utility for a CSS value, that utility MUST be used instead of an equivalent custom `@utility` or standalone CSS class; define the required `@theme` token if it does not yet exist.
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

Why: the `-canvas` suffix identifies a color intended for backgrounds, matching the `bg-*` utility.

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

Why: a literal color belongs directly in `@theme`. Values with runtime overrides use a default `:root` variable and a matching `@theme inline` mapping.

## Incorrect — Theme Overrides a Tailwind Token

```css
@theme {
  --color-primary-canvas: #fafafa;
}

[data-theme="dark"] {
  --color-primary-canvas: #18181b;
}
```

Why: Direct `@theme` tokens are intended to remain fixed. Values that change by theme should use runtime CSS variables mapped through `@theme inline`.

## Correct — Theme Overrides the Runtime Color

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

Why: `:root` defines the runtime value, scoped selectors override it, and `@theme inline` makes it available as a Tailwind utility.

## Incorrect — Scoped Radius Overrides a Fixed Token

```css
@theme {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}
```

Why: A fixed `@theme` token should not be overridden by a scoped selector. Use a runtime CSS variable and a matching `@theme inline` mapping for scoped values.

## Correct — Scoped Radius Uses the Same Token Name

```css
:root {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}

@theme inline {
  --radius-card: var(--radius-card);
}
```

Why: the matching `:root` default and scoped override provide runtime values for `rounded-card`. Without an override, this mapping adds unnecessary indirection; define `--radius-card: 8px` directly in `@theme` instead.

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

## Incorrect — Raw Declaration in a Custom Utility

```css
@utility grid-template-columns-2fr-1fr {
  grid-template-columns: 2fr 1fr;
}
```

Why: custom utilities use `@apply` rather than direct CSS declarations. Both examples define the same two-column grid.

## Correct — Custom Utility Uses `@apply`

```css
@utility grid-template-columns-2fr-1fr {
  @apply [grid-template-columns:2fr_1fr];
}
```

```tsx
<div className="grid-template-columns-2fr-1fr grid">...</div>
```

Why: the utility maps one grid property, its name reflects the CSS value, and a component explicitly uses it.

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

## Incorrect — Fixed Color Value Duplicated Across Roles

```css
@theme {
  --color-base-ink: #f9fafb;
  --color-dialog-ink: #f9fafb;
}
```

Why: both semantic roles copy the same fixed color value, making updates prone to drifting apart.

## Correct — Fixed Semantic Alias Within the Theme

```css
@theme {
  --color-base-ink: #f9fafb;
  --color-dialog-ink: var(--color-base-ink);
}
```

Why: the dialog keeps its semantic utility name while sharing a value owned by the same fixed theme. This reference is not a runtime override or an `@theme inline` mapping.

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
