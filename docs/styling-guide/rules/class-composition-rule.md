# Class Composition Rule

`cn` is the project's helper for combining conditional classes and resolving conflicting Tailwind utilities. It gives conditional classes and a passed `className` one predictable merge point.

- Components MUST use `cn` or the project's equivalent class-merging helper for conditional classes and a `className` passed to the component.
- Components MUST NOT concatenate class strings with template literals or `+` when any part is conditional.
- A `className` passed to a component MUST contain only outer-layout utilities: margins, sizing, flex or grid item placement, and `z-index`.
- A component MUST expose its supported appearance and size variants through typed props, not through a passed `className` or separate class-name props for internal elements.
- A static class list with more than five class names MUST use `cn` with multiple string literals, each grouped by styling concern and containing no more than five class names.

## Incorrect — Conditional Classes Concatenated Manually

```tsx
<button className={"rounded px-3 " + (active ? "bg-primary" : "bg-muted")} />
```

Why: the condition and merge order are embedded in a string expression, which becomes difficult to extend with consumer overrides.

## Correct — Conditional Classes Merged with `cn`

```tsx
export function Card({ className, ...props }: CardProps): React.JSX.Element {
  return <article className={cn("card-surface rounded-lg p-4", className)} {...props} />;
}

<Card className="w-full max-w-lg self-center" />;
```

Why: every class source is explicit, and a consumer can add outer layout such as `w-full max-w-lg self-center` without reconstructing the card's internal treatment.

## Incorrect — Long Static Class Literal

```tsx
<article className="rounded-lg border border-border bg-card px-6 py-4 shadow-sm transition-shadow hover:shadow-md" />
```

Why: one static literal contains more than five class names, so its styling concerns are difficult to scan.

## Correct — Static Classes Grouped in `cn`

```tsx
<article
  className={cn(
    "rounded-lg border border-border",
    "bg-card shadow-sm",
    "px-6 py-4",
    "transition-shadow hover:shadow-md",
  )}
/>
```

Why: each literal contains at most five class names and groups one styling concern.
