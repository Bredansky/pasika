# Compound Component Rule

Some primitives are a small, coordinated family of subparts rather than unrelated components. This rule keeps those subparts together without relaxing file organization for ordinary feature components.

- A primitive with documented, coordinated subparts MAY define its root and subcomponents in one module.
- A compound primitive MUST export each documented subpart with a clear component name.
- A compound primitive MUST keep styling and structure for its subparts owned by the primitive module.
- A component that is not a documented primitive subpart SHOULD remain in its own component file.

## Incorrect

```tsx
// Card.tsx
export function Card() { return <section />; }

// CardHeader.tsx
export function CardHeader() { return <header />; }
```

Why: tightly coordinated primitive pieces are split across files even though they share one public abstraction and styling contract.

## Correct

```tsx
export function Card(props: React.ComponentProps<"section">) {
  return <section data-slot="card" {...props} />;
}

export function CardHeader(props: React.ComponentProps<"header">) {
  return <header data-slot="card-header" {...props} />;
}
```

Why: the root and its documented subpart remain together as one reusable primitive while exposing clear named exports.
