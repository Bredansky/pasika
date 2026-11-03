# Theme and Utility Definition Rule

Theme tokens and custom utilities can overlap, making the styling API harder to maintain. Semantic color names (such as `--color-primary` and `--color-on-primary`, without `-canvas`/`-ink`/`-edge` postfixes) and single-operation utilities prevent redundant definitions while components own reusable presentation.

- Tailwind tokens MUST use plain `@theme` for fixed values and fixed-token aliases or `@theme inline` for runtime variables; external font-loader mappings with a `var()` fallback MAY coexist with plain `@theme`.
- Appearance modes MUST use `data-theme` and a canonical `@custom-variant` in `globals.css` named for the `data-theme` value (`dark`, `midnight`, etc.) and targeting the themed element and its descendants; mode-specific CSS declarations MUST use the registered `@variant` directive instead of direct `[data-theme]` style rules, `.dark` selectors, or CSS `prefers-color-scheme` queries.
- Tokens defined in plain `@theme` MUST NOT be redeclared outside `@theme`.
- A CSS variable referenced by an `@theme inline` token with the same name MUST have a default `:root` declaration and at least one scoped, conditional, or programmatic override.
- An `@theme inline` token MUST reference a same-named CSS variable, except `--font-*` tokens referencing external `--font-*` variables with a nonempty `var()` fallback.
- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A custom `@utility` MUST NOT simply alias an existing Tailwind class.
- Fixed CSS colors MUST be defined in `--color-*` tokens and referenced through `var()` elsewhere.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- Custom utilities with readable single-property values MUST use a property/value-derived name, including units; complex values without a theme-generated equivalent MUST use semantic names.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- `@utility`, `@theme`, default `:root`, and `@keyframes` names MUST be unique within each category across project CSS, including within one file; scoped or conditional `:root` overrides are allowed.
- `@font-face` declarations MUST be unique by family, style, weight, stretch, and Unicode range; different faces of one family are allowed.
- Distinct `@theme` tokens and default `:root` properties MUST NOT share the same static CSS value.
- Equivalent fixed colors in different syntaxes (such as HEX, RGB, HSL, or named colors) MUST reuse the same token or a semantic alias when equivalence can be established without rounding or changing precision.
- When Tailwind supports a theme-generated utility for a CSS value, that utility MUST be used instead of an equivalent custom `@utility` or standalone CSS class; define the required `@theme` token if it does not yet exist.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

## Incorrect — Duplicate Color Tokens for Different CSS Roles

```css
@theme {
  --color-brand-canvas: #2563eb;
  --color-brand-edge: #2563eb;
}
```

Why: the same color has two fixed-value definitions just to satisfy different utility roles.

## Correct — Reuse One Named Color Across Utilities

```css
@theme {
  --color-brand: #2563eb;
}
```

```tsx
<div className="bg-brand border-brand text-brand" />
```

Why: a single `--color-brand` produces background, border, and text utilities. The semantic name is independent of how the color is applied; property-role postfixes are unnecessary.

## Incorrect — Gradient Wrapped in a Custom Utility

```css
@utility bg-crt-scanlines {
  @apply [background:repeating-linear-gradient(0deg,_transparent_0_2px,_#334155_2px_4px)];
}
```

Why: a custom utility is unnecessary when Tailwind can generate the same background-image class from a semantic theme token.

## Correct — Semantic Scanline Theme Token

```css
@theme {
  --color-scanline: #334155;
  --background-image-crt-scanlines: repeating-linear-gradient(0deg, transparent 0 2px, var(--color-scanline) 2px 4px);
}
```

```tsx
<span className="bg-crt-scanlines" />
```

Why: the descriptive background-image token generates `bg-crt-scanlines` without a role suffix. Check background-property resets before replacing the `background` shorthand.

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

## Incorrect — Direct Theme Value Marked Inline

```css
@theme inline {
  --color-primary: #18181b;
}
```

Why: a literal token value does not need inline variable resolution and belongs in regular `@theme`.

## Correct — Literal Color Token Declared Directly

```css
@theme {
  --color-primary: #18181b;
}
```

Why: a literal color belongs directly in `@theme`. Values with runtime overrides use a default `:root` variable and a matching `@theme inline` mapping.

## Incorrect — Mode Styles Without a Custom Variant

```css
/* src/app/styles/home.css */
[data-theme="midnight"] {
  --color-primary: #18181b;
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
  --color-primary: #fafafa;

  @variant midnight {
    --color-primary: #18181b;
  }
}

@theme inline {
  --color-primary: var(--color-primary);
}
```

```tsx
<html data-theme="midnight">
  <body className="bg-primary">Content</body>
</html>
```

Why: `@variant midnight` overrides the runtime color, while `@theme inline` exposes it through `bg-primary`. Setting `data-theme` on `html` ensures the override applies to `:root`.

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

## Correct — External Font Alongside a Fixed Theme

```css
@theme {
  --*: initial;
  --color-content: #fafafa;
}

@theme inline {
  --font-sans: var(--font-inter, Arial), sans-serif;
}
```

Why: fixed tokens stay in plain `@theme`, while the external font variable resolves where the utility is used. `Arial` is the fallback inside `var()`, `sans-serif` is the next family, and this exception supports `next/font` without making fixed colors runtime mappings.

## Incorrect — Theme Color Wrapped in a Custom Utility

```css
@utility border-outline {
  @apply [border-color:var(--color-outline)];
}
```

Why: the color token belongs in `@theme`, which already generates `border-outline` without a custom utility.

## Correct — A Theme-Generated Border Color

```css
@theme {
  --color-outline: #d1d5db;
}
```

Why: Tailwind generates `border-outline` directly from the static theme token; a `:root` bridge is unnecessary without runtime overrides.

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
  @apply bg-primary text-on-primary rounded-md px-4;
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
  return <button className="bg-primary text-on-primary rounded-md px-4" {...props} />;
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
<button className="bg-primay text-on-primary">Save</button>
```

Why: `bg-primay` is a typo — no theme variable or custom utility generates it.

## Correct — Component References Utilities That Exist

```tsx
<button className="bg-primary text-on-primary">Save</button>
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
  --color-danger: #ef4444;
  --color-on-danger: #ffffff;
}
```

```tsx
<button className="bg-danger text-on-danger">Delete</button>
```

Why: explicit semantic tokens generate available color utilities after the default palette is reset.

## Incorrect — Fixed Color Value Duplicated Across Roles

```css
@theme {
  --color-content: #f9fafb;
  --color-dialog-content: #f9fafb;
}
```

Why: both semantic roles copy the same fixed color value, making updates prone to drifting apart.

## Correct — Fixed Semantic Alias Within the Theme

```css
@theme {
  --color-content: #f9fafb;
  --color-dialog-content: var(--color-content);
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

## Incorrect — Fixed Colors Embedded in a Shadow

```css
@theme {
  --inset-shadow-mc-donation-frame: inset 1px 1px 0 #2b2b2b, inset -1px -1px 0 #545454;
}
```

Why: the effect is correctly modeled as a single shadow token, but its fixed colors are not reusable design tokens.

## Correct — Palette Colors Compose a Shadow

```css
@theme {
  --color-mc-frame-dark: #2b2b2b;
  --color-mc-frame-light: #545454;
  --inset-shadow-mc-donation-frame:
    inset 1px 1px 0 var(--color-mc-frame-dark), inset -1px -1px 0 var(--color-mc-frame-light);
}
```

Why: the shadow remains one `--inset-shadow-*` token, while its colors reuse named `--color-*` tokens. Any CSS color format is allowed, and equivalent colors should reuse an existing token or alias.
