# Tailwind Utility Rule

Utility classes are most useful when they describe a component's local layout and appearance directly beside the element they affect. This rule prevents abstractions from hiding simple styling decisions.

- Component markup MUST use static Tailwind utility classes for local layout, spacing, typography, and straightforward visual styling.
- Components MUST NOT construct Tailwind class names from runtime fragments such as `bg-${color}`.
- Components SHOULD use the closest built-in utility before adding custom CSS or an arbitrary value.
- Components MAY use an arbitrary value when the required value is intentionally outside the available design scale.

## Incorrect

```tsx
<div className={`p-${spacing} bg-${tone}`} />
```

Why: the class scanner cannot reliably see runtime-built utility names, and the available styles depend on runtime string construction.

## Correct

```tsx
<div className="bg-muted p-4" />
```

Why: the utilities are statically discoverable and show the element's local treatment where it is rendered.
