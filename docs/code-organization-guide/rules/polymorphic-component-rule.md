# Polymorphic Component Rule

Some components need to preserve their treatment while rendering as a link, trigger, or another valid consumer element. This rule provides that flexibility without adding a wrapper that changes layout or semantics.

- A component that legitimately needs to render as another element MUST offer the project's polymorphic composition mechanism, such as Radix `Slot` with `asChild`.
- A component MUST NOT add a wrapper solely to support an alternate rendered element.
- A component SHOULD default to its semantically correct native element.
- A component MAY omit polymorphism when its native element is the only meaningful rendering.

## Incorrect

```tsx
export default function Button({ children }: { children: React.ReactNode }) {
  return (
    <button>
      <a href="/dashboard">{children}</a>
    </button>
  );
}
```

Why: the result nests interactive elements and changes both the semantic and layout contract.

## Correct

```tsx
export default function Button({ asChild = false, ...props }: ButtonProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}

<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>;
```

Why: the consumer receives one styled anchor without an invalid interactive wrapper.
