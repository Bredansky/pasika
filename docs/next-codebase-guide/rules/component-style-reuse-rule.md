# Component Style Reuse Rule

Shared class-name constants separate reusable visual styling from its markup. A shared styled component keeps the appearance and the element that renders it together.

- Shared component styling MUST be reused through component composition rather than shared class-name constants.

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
