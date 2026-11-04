# Theme and Utility Definition Rule

Theme tokens and custom utilities can overlap, making the styling API harder to maintain. Stable token names and single-operation utilities prevent redundant definitions while components own reusable presentation.

- Every Tailwind theme token, including fixed values and the default theme reset, MUST use `@theme inline`; plain `@theme` MUST NOT be used.
- A theme token MUST NOT directly alias another project-defined token through `var()`, regardless of token type.
- A project-owned runtime token MUST map to its same-named CSS variable, which MUST have a default `:root` declaration and at least one `@variant` override.
- An `@theme inline` token MUST use a fixed value when it has no `@variant` override, a direct same-named `var()` for a variant-driven value, or a fallback-backed `var()` referencing an external CSS variable. Fixed composite effects MAY reference other fixed tokens without being direct aliases.
- External CSS variable mappings MAY coexist with fixed and variant-driven tokens in `@theme inline` when they reference variables not defined by the project in CSS and supply nonempty literal fallbacks within `var()`.
- Fixed tokens defined in `@theme inline` MUST NOT be redeclared outside `@theme inline`; variant-driven tokens MUST use matching `@variant` overrides.
- Appearance modes MUST use `data-theme` and a canonical `@custom-variant` in `globals.css` named for the `data-theme` value (`dark`, `midnight`, etc.) and targeting the themed element and its descendants; mode-specific CSS declarations MUST use the registered `@variant` directive instead of direct `[data-theme]` style rules, `.dark` selectors, or CSS `prefers-color-scheme` queries.
- Tailwind color tokens MUST use semantic suffixes (`-canvas`, `-ink`, `-edge`), and color utilities MUST match those roles: canvas for backgrounds, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes. Background-image theme tokens (`--background-image-*`) MUST also end in `-canvas`.
- Fixed CSS colors MUST be defined in `--color-*` tokens and referenced through `var()` elsewhere.
- `@utility`, `@theme inline`, default `:root`, and `@keyframes` names MUST be unique within each category across project CSS, including within one file; `@variant` overrides of runtime `:root` values are allowed.
- `@font-face` declarations MUST be unique by family, style, weight, stretch, and Unicode range; different faces of one family are allowed.
- Distinct `@theme inline` tokens and default `:root` properties MUST NOT share the same static CSS value.
- Equivalent fixed colors in different syntaxes (such as HEX, RGB, HSL, or named colors) MUST reuse the same token when equivalence can be established without rounding or changing precision.
- When Tailwind supports a theme-generated utility for a CSS value, that utility MUST be used instead of an equivalent custom `@utility` or standalone CSS class; define the required `@theme inline` token if it does not yet exist.
- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom `@utility` MUST NOT simply alias an existing Tailwind class.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- Custom utilities with readable single-property values MUST use a property/value-derived name, including units; complex values without a theme-generated equivalent MUST use semantic names.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

## Incorrect — Fixed Token Uses Plain Theme

```css
@theme {
  --color-primary-canvas: #18181b;
}
```

Why: the project uses only `@theme inline`, even for fixed values.

## Correct — Literal Color Token Declared Inline

```css
@theme inline {
  --color-primary-canvas: #18181b;
}
```

Why: a fixed color has its value directly in `@theme inline`. Variant-driven tokens instead use a matching runtime variable.

## Incorrect — Direct Selector Overrides a Fixed Radius

```css
@theme inline {
  --radius-card: 8px;
}

[data-density="compact"] {
  --radius-card: 4px;
}
```

Why: a fixed token must not be overridden through a selector; a runtime token requires `@variant` and a same-named `:root` default.

## Correct — Radius Changes Through a Variant

```css
/* globals.css */
@custom-variant compact (&:where([data-density="compact"], [data-density="compact"] *));

:root {
  --radius-card: 8px;

  @variant compact {
    --radius-card: 4px;
  }
}

@theme inline {
  --radius-card: var(--radius-card);
}
```

Why: the matching `:root` default and `@variant compact` override make `rounded-card` dynamic. Without the variant, define `--radius-card: 8px` directly in `@theme inline`.

## Incorrect — External Mapping Without a Fallback

```css
@theme inline {
  --font-sans: var(--font-inter);
}
```

Why: a value supplied by an external provider requires a fallback inside `var()` so the utility still has a valid value when the provider variable is missing.

## Correct — External CSS Variables Share the Inline Theme

```css
@theme inline {
  --radius-base: 8px;
  --font-sans: var(--font-inter, Arial);
  --color-brand-canvas: var(--vendor-brand-color, #2563eb);
}
```

Why: fixed tokens and external mappings share `@theme inline`. Each external variable has a literal fallback, and the exception is not limited to fonts.

## Incorrect — Mode Styles Without a Custom Variant

```css
/* src/app/styles/home.css */
[data-theme="midnight"] {
  --color-primary-canvas: #18181b;
}
```

Why: this adds a separate mode-switching mechanism through a CSS selector instead of using the project's registered Tailwind variant.

## Correct — Named Mode Overrides a Runtime Theme Token

```css
/* src/app/styles/globals.css */
@custom-variant midnight (&:where([data-theme="midnight"], [data-theme="midnight"] *));
```

```css
/* src/app/styles/home.css */
:root {
  --color-primary-canvas: #fafafa;

  @variant midnight {
    --color-primary-canvas: #18181b;
  }
}

@theme inline {
  --color-primary-canvas: var(--color-primary-canvas);
}
```

```tsx
<html data-theme="midnight">
  <body className="bg-primary-canvas">Content</body>
</html>
```

Why: `@variant midnight` overrides the runtime color, while `@theme inline` exposes it through `bg-primary-canvas`. Setting `data-theme` on `html` ensures the override applies to `:root`.

## Incorrect — Color Token Aliased to Another Token

```css
@theme inline {
  --color-brand-canvas: #2563eb;
  --color-brand-edge: var(--color-brand-canvas);
}
```

Why: a direct token-to-token alias is forbidden regardless of whether the two tokens share a semantic role.

## Correct — Independent Fixed Color Token

```css
@theme inline {
  --color-brand-canvas: #2563eb;
}
```

```tsx
<div className="bg-brand-canvas" />
```

Why: the fixed canvas color is defined directly and reused without an unnecessary second token or alias.

## Incorrect — Duplicate Fixed Ink Tokens

```css
@theme inline {
  --color-base-ink: #f9fafb;
  --color-dialog-ink: #f9fafb;
}
```

Why: both ink tokens define the same fixed color value, even though the dialog can reuse the existing token.

## Correct — Reuse the Existing Ink Token

```css
@theme inline {
  --color-base-ink: #f9fafb;
}
```

```tsx
<p className="text-base-ink">Dialog content</p>
```

Why: the dialog reuses the existing ink token without creating a second color token or a cross-token alias.

## Incorrect — Duplicate Configured Typography Utility

```css
@theme inline {
  --text-sm: 14px;
  --text-retro-14: 14px;
}
```

Why: both classes emit the same font-size with no additional styling, so the alias adds no capability.

## Correct — Reuse an Equivalent Typography Utility

```css
@theme inline {
  --text-sm: 14px;
}
```

Why: reuse `text-sm` instead of registering a second token for the same value; sizes with different units or additional line-height and letter-spacing remain distinct.

## Incorrect — Fixed Colors Embedded in a Shadow

```css
@theme inline {
  --inset-shadow-mc-donation-frame: inset 1px 1px 0 #2b2b2b, inset -1px -1px 0 #545454;
}
```

Why: the effect is correctly modeled as a single shadow token, but its fixed colors are not reusable design tokens.

## Correct — Palette Colors Compose a Shadow

```css
@theme inline {
  --color-mc-frame-dark-canvas: #2b2b2b;
  --color-mc-frame-light-canvas: #545454;
  --inset-shadow-mc-donation-frame:
    inset 1px 1px 0 var(--color-mc-frame-dark-canvas), inset -1px -1px 0 var(--color-mc-frame-light-canvas);
}
```

Why: the shadow remains one `--inset-shadow-*` token, while its colors reuse named `--color-*` tokens. Any CSS color format is allowed; equivalent colors must reuse an existing token directly, never an alias.

## Incorrect — Gradient Wrapped in a Custom Utility

```css
@utility bg-crt-scanlines {
  @apply [background:repeating-linear-gradient(0deg,_transparent_0_2px,_#334155_2px_4px)];
}
```

Why: a custom utility is unnecessary when Tailwind can generate the same background-image class from a semantic theme token.

## Correct — Semantic Scanline Theme Token

```css
@theme inline {
  --color-scanline-canvas: #334155;
  --background-image-crt-scanlines-canvas: repeating-linear-gradient(
    0deg,
    transparent 0 2px,
    var(--color-scanline-canvas) 2px 4px
  );
}
```

```tsx
<span className="bg-crt-scanlines-canvas" />
```

Why: the `-canvas` background-image token generates `bg-crt-scanlines-canvas` while its fixed color comes from a named color token. Check background-property resets before replacing the `background` shorthand.

## Incorrect — Theme Color Wrapped in a Custom Utility

```css
@utility border-control-edge {
  @apply [border-color:var(--color-control-edge)];
}
```

Why: the color token belongs in `@theme inline`, which already generates `border-control-edge` without a custom utility.

## Correct — A Theme-Generated Border Color

```css
@theme inline {
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
@theme inline {
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
@theme inline {
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

## Incorrect — Complex Value Encoded in a Utility Name

```css
@utility clip-path-polygon-0-0-100pct-0-95pct-100pct-5pct-100pct {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}
```

Why: encoding every polygon coordinate produces a long, implementation-specific name instead of describing the intended shape.

## Correct — Semantic Complex Utility

```css
@utility clip-trapezoid {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}
```

Why: `polygon(...)` is complex because `readableValue()` cannot reduce it to 1–8 supported parts (numbers and units, hex colors, identifiers, or simple `var(--name)` references) and a slug of at most 70 characters. `clip-trapezoid` describes the intended shape; semantic naming quality still requires human review.

## Incorrect — Vague Name for a Readable Mapping

```css
@utility bg-pixel-tiles {
  @apply [background-size:24px_24px];
}
```

Why: `24px 24px` is readable, so the name must preserve the property and units.

## Correct — Readable Property and Value

```css
@utility bg-size-24px-24px {
  @apply [background-size:24px_24px];
}
```

Why: `bg-size-24px-24px` directly describes the single CSS operation.

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
@theme inline {
  --color-danger-canvas: #ef4444;
  --color-danger-ink: #ffffff;
}
```

```tsx
<button className="bg-danger-canvas text-danger-ink">Delete</button>
```

Why: explicit semantic tokens generate available color utilities after the default palette is reset.
