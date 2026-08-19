# Tailwind Utility Rule

Utility classes are most useful when they describe a component's local layout and appearance directly beside the element they affect. This rule prevents abstractions from hiding simple styling decisions.

- Component markup MUST use static Tailwind utility classes for local layout, spacing, typography, and straightforward visual styling.
- Components MUST NOT construct Tailwind class names from runtime fragments such as `bg-${color}`.
- Components MUST use the closest project token or built-in utility for a static design value.
- Components MUST NOT use literal arbitrary-value classes such as `top-[13px]` or `text-[#50d71e]` for project-owned styling.
- A missing static design value MUST become an explicit project token or a named custom utility instead of an arbitrary literal in markup.
- A CSS custom property MAY use Tailwind's custom-property shorthand when a named utility intentionally exposes that property-specific value.

## Incorrect — Tailwind Classes Constructed at Runtime

```tsx
<div className={`p-${spacing} bg-${tone}`} />
```

Why: the class scanner cannot reliably see runtime-built utility names, and the available styles depend on runtime string construction.

## Correct — Static Tailwind Classes

```tsx
<div className="bg-muted p-4" />
```

Why: the utilities are statically discoverable and show the element's local treatment where it is rendered.

## Incorrect — Literal Arbitrary Radius

```tsx
<button className="rounded-[13px]">Save</button>
```

Why: the design value is hidden in markup and cannot be tracked as part of the project's explicit token set.

## Correct — Named Radius Token

```css
:root {
  --radius-md: 0.8125rem;
}

@theme inline {
  --radius-md: var(--radius-md);
}
```

```tsx
<button className="rounded-md">Save</button>
```

Why: the named value makes the radius searchable and exposes a standard Tailwind radius utility.
