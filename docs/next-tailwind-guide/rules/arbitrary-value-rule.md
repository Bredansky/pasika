# Arbitrary Value Rule

Raw arbitrary values and CSS-variable references hide the project's styling API in component code. Components should consume named Tailwind utilities while custom utilities own the mapping to otherwise unnamed values.

- Components MUST NOT use arbitrary-value classes, arbitrary-property classes, or custom-property shorthand for project styling. They MUST use a named utility that maps the value instead.

## Incorrect — Literal Arbitrary Radius

```tsx
<button className="rounded-[13px]">Save</button>
```

Why: the design value is hidden in markup and cannot be tracked as part of the project's explicit token set.

## Correct — Named Radius Token

```css
:root {
  --radius-md: 0.375rem;
}

@theme inline {
  --radius-md: var(--radius-md);
}
```

```tsx
<button className="rounded-md">Save</button>
```

Why: the named value makes the radius searchable and exposes the matching Tailwind radius utility.

## Incorrect — CSS Variable Referenced Directly

```tsx
<img className="max-h-(--media-preview-max-height) object-contain" />
```

Why: the component reaches through the project's styling API and binds itself directly to a CSS implementation detail.

Tailwind's typed custom-property shorthand is the same kind of raw reference and is also forbidden:

```tsx
<p className="text-(color:--tweet-card-ink)" />
<p className="text-(length:--tweet-card-name-text-size)" />
```

The type hint only disambiguates how Tailwind interprets the variable; it does not make the component-level reference a named project utility.

## Correct — CSS Variable Mapped Through a Utility

```css
:root {
  --media-preview-max-height: 80vh;
}

@utility max-h-media-preview {
  @apply max-h-(--media-preview-max-height);
}
```

```tsx
<img className="max-h-media-preview object-contain" />
```

Why: the component consumes a stable named utility while the stylesheet owns the CSS-variable mapping.
