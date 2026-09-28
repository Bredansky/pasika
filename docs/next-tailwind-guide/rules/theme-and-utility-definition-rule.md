# Theme and Utility Definition Rule

Project values need stable Tailwind names, while presentation reuse belongs to components. Custom utilities bridge values or properties into Tailwind; they are not reusable style bundles.

- A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.
- A value that needs at least two utility classes from the same [Tailwind theme-variable namespace](https://tailwindcss.com/docs/theme#theme-variable-namespaces) MUST use that namespace and have the same name in `:root`.
- Property-specific colors MUST use the reserved semantic suffixes `canvas` for backgrounds, `ink` for readable text, and `edge` for visual boundaries, with matching utilities such as `bg-<role>-canvas`, `text-<role>-ink`, and `<property>-<role>-edge`.
- Non-color custom values MUST use descriptive domain names such as `--tweet-card-name-text-size` or `--media-preview-max-height` and MUST NOT use the reserved color-role suffixes.
- A custom utility MUST use `@apply` for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.
- A custom utility MUST be statically referenced by at least one file in the repository's source.
- A utility class a component statically references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.

## Incorrect — Property-Specific Color Exposed Broadly

```css
:root {
  --color-header-ink: #111827;
}

@theme inline {
  --color-header-ink: var(--color-header-ink);
}
```

```tsx
<h1 className="text-header-ink">Title</h1>
```

Why: registering a text-only color in `--color-*` also creates unintended background, border, ring, and other color utilities.

## Correct — Property-Specific Utility

```css
:root {
  --header-ink: #111827;
}

@utility text-header-ink {
  @apply text-(--header-ink);
}
```

```tsx
<h1 className="text-header-ink">Title</h1>
```

Why: the custom utility maps one CSS variable to the one Tailwind operation the component needs.

## Incorrect — Boundary Value Named After a CSS Property

```css
:root {
  --control-border: #d1d5db;
}

@utility border-control {
  @apply border-(--control-border);
}
```

Why: `border` is repeated as both the CSS property and the value role, while the variable cannot describe the same boundary color when an outline, ring, or stroke needs it.

## Correct — Boundary Value Uses an Edge Role

```css
:root {
  --control-edge: #d1d5db;
}

@utility border-control-edge {
  @apply border-(--control-edge);
}
```

Why: `edge` names the value's visual role, and `border` names the property through which the utility applies it.

## Incorrect — Non-Color Value Reuses a Color Role

```css
:root {
  --tweet-card-name-ink: 0.875rem;
}

@utility text-tweet-card-name-ink {
  @apply text-(length:--tweet-card-name-ink);
}
```

Why: `ink` is reserved for readable text colors, but this value is a font size.

## Correct — Non-Color Value Uses a Descriptive Name

```css
:root {
  --tweet-card-name-text-size: 0.875rem;
}

@utility text-tweet-card-name-size {
  @apply text-(length:--tweet-card-name-text-size);
}
```

Why: the variable describes the value it stores, while the utility name keeps the Tailwind `text-` operation and makes the size role explicit without extending the color-role vocabulary.

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
