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

## Incorrect — Shared Class Composition Exported From Constants

```tsx
// src/constants/minecraft-control-classes.ts
export const minecraftControlClassName = "border-2 bg-mc-button p-2 shadow-mc text-sm";

// Two separate components import the classes to style their own native elements:
<button className={minecraftControlClassName} />;
<a className={minecraftControlClassName} />;
```

Why: the exported styling string becomes a public styling API. Reusing it bypasses the shared component requirement.

## Correct — Shared Component Owns Its Classes

```tsx
function MinecraftControl({ as: Tag = "button", ...props }: MinecraftControlProps): React.JSX.Element {
  return <Tag className="bg-mc-button shadow-mc border-2 p-2 text-sm" {...props} />;
}
```

Why: separate consumers reuse a UI component with typed behavior instead of importing the component's styling. Local class variables and component-local CVA variants remain valid.
