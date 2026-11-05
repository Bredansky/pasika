# Tailwind Class Reuse Rule

Identical class sets across native JSX elements and exported class compositions used by multiple components duplicate styling ownership. Reuse one component to keep that styling in one place.

- Native JSX elements in different source files with the same tag and identical static sets of at least five classes MUST share a component.
- Exported static class sets of at least five classes used by native JSX elements in multiple source files MUST be encapsulated by a shared component.

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
