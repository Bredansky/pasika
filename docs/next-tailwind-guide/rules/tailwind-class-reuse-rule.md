# Tailwind Class Reuse Rule

Standalone class-name aliases separate visual styling from its owner. Repeated static class sets across native JSX elements also duplicate styling ownership.

- Tailwind class strings used for styling MUST NOT be extracted into standalone constants, enums, or other aliases. Strings used solely as display text are exempt.
- Native JSX elements in different source files MUST share a component when they either have the same tag and identical static sets of at least five classes or use the same exported static class set of at least two classes.

## Incorrect — Enum Used As A Styling Alias

```tsx
enum PrimitiveCssClass {
  Glow = "hover:shadow-retro-glow",
  FireBar = "h-3px",
}

<div className={PrimitiveCssClass.FireBar} />;
```

Why: the enum hides styling classes from their JSX owner instead of modeling a real application domain.

## Correct — Literal Styling With Separate Showcase Metadata

```tsx
enum PrimitiveCssExample {
  FireBar = ".h-3px",
}

const exampleMetadata = { className: PrimitiveCssExample.FireBar };

<div className="h-3px" />;
<code>{exampleMetadata.className}</code>;
```

Why: the enum is documentation text only; the rendered element owns its styling.

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

## Incorrect — Local Tailwind Class Alias

```tsx
const layout = "inline-flex items-center gap-2";
const typography = "text-sm font-medium";

<button className={cn(layout, typography)} />;
```

Why: even local constants separate the class strings from their styling owner.

## Correct — Direct Class Composition

```tsx
<button className="inline-flex items-center gap-2 text-sm font-medium" />;

const buttonClasses = cn("inline-flex items-center", active && "ring-2");
<button className={buttonClasses} />;
```

Why: literal classes stay in their styling positions, while the named composition result represents computed styling.
