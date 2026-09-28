# Arbitrary Value Rule

Raw arbitrary values and CSS-variable references hide the project's styling API in component code. Components should consume named Tailwind utilities while custom utilities own the mapping to otherwise unnamed values.

- Components MUST NOT use Tailwind arbitrary values, arbitrary properties, or custom property (CSS variable) syntax for project styling. They MUST use a named utility that maps the value instead.

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

## Incorrect — Typed Color Custom Property

```tsx
<p className="text-(color:--tweet-card-ink)" />
```

Why: the type hint only disambiguates the custom property's meaning for Tailwind; the component still references the CSS variable directly.

## Correct — Typed Color Mapped Through a Utility

```css
@utility text-tweet-card-ink {
  @apply text-(color:--tweet-card-ink);
}
```

```tsx
<p className="text-tweet-card-ink" />
```

Why: the component uses a named project utility while the stylesheet owns the typed custom-property reference.

## Incorrect — Typed Length Custom Property

```tsx
<p className="text-(length:--tweet-card-name-text-size)" />
```

Why: the component still depends directly on the CSS variable even though the type hint tells Tailwind to interpret it as a length.

## Correct — Typed Length Mapped Through a Utility

```css
@utility text-tweet-card-name-size {
  @apply text-(length:--tweet-card-name-text-size);
}
```

```tsx
<p className="text-tweet-card-name-size" />
```

Why: `size` disambiguates the Tailwind `text-` operation from a text-color utility, while the stylesheet keeps ownership of the raw typed value.
