# Class Composition Rule

Class conditions and caller overrides need one consistent merge point so ordering stays understandable and conflicting Tailwind utilities resolve correctly.

- Components MUST use `cn` or the project's equivalent class-merging helper for conditional classes and a consumer-provided `className`.
- Components MUST NOT concatenate class strings with template literals or `+` when any part is conditional.
- A consumer-provided `className` MUST contain only outer-layout utilities: margins, width constraints, permitted height constraints, and flex or grid item placement.
- Permitted height constraints MUST be limited to `h-full`, `h-auto`, `min-h-*`, and `max-h-*`; fixed component heights MUST use a typed component API or an external wrapper.
- A consumer-provided `className` MUST NOT change padding, internal gaps, fixed height, colors, typography, borders, radius, shadows, effects, positioning, inset, or z-index.
- A component MUST expose supported internal appearance and fixed-size choices through typed props rather than consumer classes.
- Components SHOULD group long static class lists by concern inside `cn`.
- Components MAY keep a short, fully static `className` string inline.

## Incorrect

```tsx
<button className={"rounded px-3 " + (active ? "bg-primary" : "bg-muted")} />
```

Why: the condition and merge order are embedded in a string expression, which becomes difficult to extend with consumer overrides.

## Correct

```tsx
export default function Card({ className, ...props }: CardProps): React.JSX.Element {
  return <article className={cn("surface-card rounded-lg p-4", className)} {...props} />;
}

<Card className="w-full max-w-lg self-center" />;
```

Why: every class source is explicit, and a consumer can add outer layout such as `w-full max-w-lg self-center` without reconstructing the card's internal treatment.
