# Arbitrary Value Rule

Literal arbitrary-value classes hide project design values in component code. This rule requires every project-owned value to have a named utility or token.

- Components MUST NOT use arbitrary-value classes for project styling. They MUST use an existing Tailwind or project utility, or define a project token or custom utility first.

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
