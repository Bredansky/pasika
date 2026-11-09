# Theme and Utility Definition Rule

Uncontrolled theme tokens and custom CSS create inconsistent styling APIs, duplicate values, and unclear ownership of reusable presentation.

- Styling MUST prioritize existing Tailwind utilities, then theme-generated utilities (defining `@theme inline` tokens when needed); custom `@utility` or standalone CSS is allowed only when neither option can express the value.
- Every Tailwind theme token, including fixed values and the default theme reset, MUST use `@theme inline`.
- Theme tokens with values identical to the installed Tailwind defaults MUST end with `/* Tailwind default */` on the same declaration line, distinguishing required re-declarations after `--*: initial` from custom overrides.
- Numeric spacing utilities MUST be backed by the base `--spacing` token after the global theme reset.
- A theme token MUST NOT directly alias a different theme token through `var()`.
- Only tokens with `@variant` overrides MUST map to a same-named `var()` in `@theme inline`, backed by a default `:root` declaration and matching `@variant` overrides.
- Tokens without their own `@variant` overrides MUST define fixed values or composite effects in `@theme inline`, or map to external CSS variables with nonempty literal `var()` fallbacks.
- Fixed theme tokens MUST NOT be overridden outside `@theme inline`.
- Appearance modes MUST use `data-theme` and a canonical `@custom-variant` in `globals.css` named for the `data-theme` value (`dark`, `midnight`, etc.) and targeting the themed element and its descendants; mode-specific CSS declarations MUST use the registered `@variant` directive instead of direct `[data-theme]` style rules, `.dark` selectors, or CSS `prefers-color-scheme` queries.
- Tailwind color tokens with semantic suffixes (`-canvas`, `-ink`, `-edge`) MUST match their utility roles: canvas for backgrounds, background images, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes. Color tokens shared across roles MUST omit the semantic suffix.
- Fixed colors used more than once in a stylesheet MUST be defined as `--color-*` tokens and referenced through `var()`; colors used exactly once MUST be written directly in any CSS declaration or `@apply` expression.
- `@utility`, `@theme inline`, default `:root`, and `@keyframes` names MUST be unique within each category across project CSS, including within one file; `@variant` overrides of runtime `:root` values are allowed.
- `@font-face` declarations MUST be unique by family, style, weight, stretch, and Unicode range; different faces of one family are allowed.
- Distinct `@theme inline` tokens and default `:root` properties MUST NOT share equivalent static CSS values. Equivalent HEX, RGB, HSL, and named colors MUST be compared without rounding or changing precision.
- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- Custom single-property utilities MUST use property/value-derived names when values contain 1–8 simple parts (numbers with units, hex colors, identifiers, or `var(--name)`) forming a value slug of at most 70 characters; `var(--name)` contributes `name` without a `var-` prefix. Otherwise the value is complex and the utility MUST use a property-prefixed semantic name when no theme-generated equivalent exists.
- Custom `@utility` declarations, non-foundational `@theme inline` tokens, and custom `@keyframes` MUST have a static reference in project CSS or source; unused definitions MUST be removed.
- CSS definitions MUST use component file paths including extensions for single consumers within each scope, or feature paths and app/compositions/shared roots for multiple consumers; mixed consumer scopes and definitions MUST be sorted alphabetically.
- CSS consumer group comments MUST have an associated CSS definition; orphaned group comments MUST be removed.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

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
@import "tailwindcss";

@theme inline {
  --*: initial;
  --radius-card: var(--radius-card);
}

@custom-variant compact (&:where([data-density="compact"], [data-density="compact"] *));

:root {
  --radius-card: 8px;

  @variant compact {
    --radius-card: 4px;
  }
}
```

Why: because the radius varies, `@theme inline` maps it to its same-named `:root` default and `@variant compact` override. A fixed radius needs only its literal `@theme inline` value.

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
@import "tailwindcss";

@theme inline {
  --*: initial;
}

@import "./home.css";

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

Why: a bare `var(--other-token)` alias creates another token instead of reusing the original. This restriction does not apply to composite values such as shadows or gradients that reference existing color tokens.

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

## Incorrect — Repeated Fixed Color Without a Token

```css
@theme inline {
  --shadow-card: 0 1px 2px #2b2b2b;
  --background-image-card-canvas: linear-gradient(#2b2b2b, #545454);
}
```

Why: `#2b2b2b` is repeated in the same stylesheet, so it must be a reusable color token. The one-off `#545454` must stay inline instead of getting a separate token.

## Correct — Reuse Repeated Colors and Inline One-Off Colors

```css
@theme inline {
  --color-frame: #2b2b2b;
  --shadow-card: 0 1px 2px var(--color-frame);
  --background-image-card-canvas: linear-gradient(var(--color-frame), #545454);
}
```

Why: the repeated fixed color has one named definition; the gradient's unique color stays inline. The same rule applies to ordinary properties, other shadow types, and `@apply` expressions.

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
  --background-image-crt-scanlines-canvas: repeating-linear-gradient(0deg, transparent 0 2px, #334155 2px 4px);
}
```

```tsx
<span className="bg-crt-scanlines-canvas" />
```

Why: the `-canvas` background-image token generates `bg-crt-scanlines-canvas`. Its one-off color must stay inline, but if another declaration needs the same color, extract a `--color-*` token; check background-property resets before replacing the `background` shorthand.

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
@utility clip-path-trapezoid {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}
```

Why: `polygon(...)` contains a function rather than 1–8 supported simple parts. `clip-path-trapezoid` preserves the CSS property and describes the shape; whether the semantic suffix is meaningful still requires review.

## Incorrect — Semantic Name for a Simple Value

```css
@utility bg-pixel-tiles {
  @apply [background-size:24px_24px];
}
```

Why: `24px 24px` contains two supported simple parts and produces a value slug shorter than 70 characters, so the name must encode the property, both values, and their units.

## Correct — Property and Value in the Utility Name

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
