# Tailwind Class Reuse Rule

Shared class-name constants separate reusable visual styling from its markup. Repeated static class sets across native JSX elements also duplicate styling ownership.

- Shared component styling MUST be reused through component composition rather than shared class-name constants.
- Native JSX elements in different source files MUST share a component when they either have the same tag and identical static sets of at least five classes or use the same exported static class set of at least two classes.

## Incorrect — Sharing Class Names Between Components

```tsx
// src/constants/index.ts
export const panelClassName = "rounded-md border p-4";

// src/features/home/home-summary.tsx
import { panelClassName } from "@/constants";

export function HomeSummary(): React.JSX.Element {
  return (
    <section className={panelClassName}>
      <HomeDetails />
    </section>
  );
}

// src/features/merch/merch-summary.tsx
import { panelClassName } from "@/constants";

export function MerchSummary(): React.JSX.Element {
  return (
    <section className={panelClassName}>
      <MerchDetails />
    </section>
  );
}
```

Why: two components share the same visual treatment only through a class-name constant, so the markup and appearance can drift independently.

## Correct — Reuse a Styled Component

```tsx
// src/shared/panel.tsx
export function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <section className="rounded-md border p-4">{children}</section>;
}

// src/features/home/home-summary.tsx
import { Panel } from "@/shared/panel";

export function HomeSummary(): React.JSX.Element {
  return (
    <Panel>
      <HomeDetails />
    </Panel>
  );
}

// src/features/merch/merch-summary.tsx
import { Panel } from "@/shared/panel";

export function MerchSummary(): React.JSX.Element {
  return (
    <Panel>
      <MerchDetails />
    </Panel>
  );
}
```

Why: the shared component owns the element and its appearance, while each consumer supplies only its own content.

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
