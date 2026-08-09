# Class Composition Rule

Class conditions and caller overrides need one consistent merge point so ordering stays understandable and conflicting Tailwind utilities resolve correctly.

- Components MUST use `cn` or the project's equivalent class-merging helper for conditional classes and a consumer-provided `className`.
- Components MUST NOT concatenate class strings with template literals or `+` when any part is conditional.
- Components SHOULD group long static class lists by concern inside `cn`.
- Components MAY keep a short, fully static `className` string inline.

## Incorrect

```tsx
<button className={"rounded px-3 " + (active ? "bg-primary" : "bg-muted")} />
```

Why: the condition and merge order are embedded in a string expression, which becomes difficult to extend with consumer overrides.

## Correct

```tsx
<button
  className={cn(
    "rounded px-3",
    active ? "bg-primary" : "bg-muted",
    className,
  )}
/>
```

Why: every class source is explicit, and the consumer override is applied last through the shared merge helper.
