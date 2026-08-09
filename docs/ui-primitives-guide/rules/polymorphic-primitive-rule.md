# Polymorphic Primitive Rule

Some primitives need to preserve their treatment while rendering as a link, trigger, or another valid consumer element. This rule provides that flexibility without adding a wrapper that changes layout or semantics.

- A primitive that legitimately needs to render as another element MUST offer the project's polymorphic composition mechanism, such as Radix `Slot` with `asChild`.
- A primitive MUST NOT add a wrapper solely to support an alternate rendered element.
- A primitive SHOULD default to its semantically correct native element.
- A primitive MAY omit polymorphism when its native element is the only meaningful rendering.

## Incorrect

```tsx
function Button({ children }: { children: React.ReactNode }) {
  return <button><a href="/dashboard">{children}</a></button>;
}
```

Why: the result nests interactive elements and changes both the semantic and layout contract.

## Correct

```tsx
function Button({ asChild = false, ...props }: ButtonProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}

<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

Why: the consumer receives one styled anchor without an invalid interactive wrapper.
