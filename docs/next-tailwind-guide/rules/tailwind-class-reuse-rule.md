# Tailwind Class Reuse Rule

Repeated static class sets across native JSX elements duplicate styling ownership. Exporting the classes through a constant does not eliminate the duplication.

- Native JSX elements in different source files MUST share a component when they either have the same tag and identical static sets of at least five classes or use the same exported static class set of at least five classes.

## Incorrect — Identical Class Sets In Separate Files

```tsx
// src/features/home/home-card.tsx
<div className="bg-card border-panel-edge rounded-lg border shadow-lg p-4">
  <HomeDetails />
</div>

// src/features/merch/merch-card.tsx
<div className="p-4 shadow-lg border rounded-lg border-panel-edge bg-card">
  <ProductDetails />
</div>
```

Why: both native divs contain the same six classes despite differing order and children.

## Correct — One Shared Styled Container

```tsx
function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="bg-card border-panel-edge rounded-lg border shadow-lg p-4">{children}</div>;
}

// src/features/home/home-card.tsx
<Panel><HomeDetails /></Panel>

// src/features/merch/merch-card.tsx
<Panel><ProductDetails /></Panel>
```

Why: the full six-class set has one owner while the content remains independent.
