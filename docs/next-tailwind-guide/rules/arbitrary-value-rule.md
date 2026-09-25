# Arbitrary Value Rule

Arbitrary values keep one-off static styling in Tailwind without creating a global token or utility for a single use.

- Components MAY use arbitrary-value classes for one-off static styling when no existing utility represents the value.

## Incorrect — One-Off Value Extracted Globally

```css
@utility hero-offset {
  @apply top-[117px];
}
```

```tsx
<div className="hero-offset" />
```

Why: a single consumer does not need a project-wide utility name.

## Correct — One-Off Arbitrary Value

```tsx
<div className="top-[117px]" />
```

Why: the one-off value stays local while still using Tailwind.
