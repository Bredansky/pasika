# Non-Component Placement Rule

Without a consistent extraction and placement strategy, shared non-component files either end up too high, too low, or in separate files before they need an independent identity. This rule decides what stays inline and where extracted non-component files belong.

- Extraction MUST be decided before closest common folder (CCF) placement is calculated.
- A type or schema MUST stay inline in its component file while no consumer imports it independently of that component.
- A constant MUST stay inline in its consuming file while no consumer imports it independently.
- A pure function MUST always live in the nearest valid `utils/` folder, even when it has one consumer.
- A custom hook MUST follow the repository's reuse and imperative-complexity extraction triggers.
- Every extracted non-component file MUST live in the closest common folder (CCF) of its consumers.
- When calculating a non-component file’s CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a non-component file’s CCF is `src/features/`, it MUST move to the corresponding `src/shared/` support folder.
- A non-component file shared by two or more flat compositions or shared components MUST live in that layer's corresponding support folder.
- An app-wide non-component file with no lower-layer owner MUST live in the corresponding root folder under `src/`.
- `src/features/` and `src/app/` MUST NOT contain support folders directly.
- Configuration values — hardcoded application data, environment parsing, and third-party service settings — MUST live in `src/config/` regardless of consumers.
- Configuration values MUST NOT be duplicated into `constants/`.
- Extracted constants MUST be defined directly in the nearest `constants/index.ts` with named exports.
- Types and schemas MUST use leaf files plus a named-export `index.ts` barrel at the owning scope.
- Pure utilities and custom hooks MUST be imported directly without a barrel.
- A type leaf file MUST use the kebab-case form of its type name; a grouped type file MUST use its kebab-case domain name.
- A schema leaf file MUST use the kebab-case form of its schema name; a grouped schema file MUST use its kebab-case domain name.
- A pure utility file MUST use the kebab-case form of its function name when it exports one function and its kebab-case domain name when it exports multiple functions.
- A custom hook file MUST use the kebab-case form of its hook name and contain one hook.
- If only some exports from a domain-grouped file need a new placement, those exports MUST be split into their own file before moving.

| Non-component file | Before independent extraction                   | Extracted structure                                    | Public export                            |
| -------------- | ----------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Pure utilities | Always extracted                                | One function per file or grouped by domain in `utils/` | Direct import; no barrel                 |
| Types          | Inline while always consumed with the component | One type per file or grouped by domain in `types/`     | Named exports through `types/index.ts`   |
| Schemas        | Inline while always consumed with the component | One schema per file or grouped by domain in `schemas/` | Named exports through `schemas/index.ts` |
| Constants      | Inline while not imported independently         | Definitions together in `constants/index.ts`           | Named exports from `constants/index.ts`  |
| Custom hooks   | Inline until a hook extraction trigger applies  | One hook per file in `hooks/`                          | Direct import; no barrel                 |
| Config         | Always extracted to `src/config/`               | One domain per file                                    | Direct import; no barrel                 |

## Incorrect — Composition Affects a Feature Type's CCF

```text
src/
├── compositions/
│   └── BillingDashboard.tsx
├── features/
│   └── billing/
│       └── Invoice.tsx
└── types/
    └── billing.ts
```

Why: a composition importing a billing-owned type does not make that type app-wide; the higher layer is allowed to consume the lower feature without changing its ownership.

## Correct — Feature Type Remains in Its Owning Feature

```text
src/
├── compositions/
│   └── BillingDashboard.tsx
└── features/
    └── billing/
        ├── Invoice.tsx
        └── types/
            ├── billing.ts
            └── index.ts
```

```ts
// src/features/billing/types/billing.ts
export type InvoiceStatus = "draft" | "paid";
export type PaymentMethod = "card" | "bank";

// src/features/billing/types/index.ts
export type { InvoiceStatus, PaymentMethod } from "./billing";
```

Why: billing owns the types, and both its own components and higher-layer compositions may import the feature's public type barrel without promoting it.

## Incorrect — Type Imported Independently from a Component

```tsx
// src/features/billing/Invoice.tsx
export type DateRange = { from: Date; to: Date };

export function Invoice({ range }: { range: DateRange }): React.JSX.Element {
  return <InvoiceView range={range} />;
}
```

```ts
// src/features/billing/hooks/use-billing-filter.ts
import type { DateRange } from "../Invoice";
```

Why: the hook imports `DateRange` independently and has to reach into a component file for a type that now has its own consumer identity.

## Correct — Independently Consumed Type Extracted

```ts
// src/features/billing/types/date-range.ts
export type DateRange = { from: Date; to: Date };

// src/features/billing/types/index.ts
export type { DateRange } from "./date-range";

// src/features/billing/hooks/use-billing-filter.ts
import { type DateRange } from "../types";
```

Why: the independent type lives in a named-export barrel at the closest valid scope, while the component and hook remain independent consumers.

## Incorrect — Pure Function Left Beside Its Consumer

```tsx
// src/features/billing/invoice.tsx
const calculateInvoiceTotal = (items: InvoiceItem[]): number => {
  return items.reduce((total, item) => total + item.amount, 0);
};

export function Invoice({ items }: InvoiceProps): React.JSX.Element {
  const total = calculateInvoiceTotal(items);
  return <InvoiceTotal value={total} />;
}
```

Why: a pure function always receives its own utility file, even with one consumer, so the component file stays focused on rendering.

## Correct — Pure Helper in the Nearest `utils/` Folder

```ts
// src/features/billing/utils/calculate-invoice-total.ts
export function calculateInvoiceTotal(items: InvoiceItem[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}
```

```tsx
// src/features/billing/invoice.tsx
import { calculateInvoiceTotal } from "./utils/calculate-invoice-total";

export function Invoice({ items }: InvoiceProps): React.JSX.Element {
  const total = calculateInvoiceTotal(items);
  return <InvoiceTotal value={total} />;
}
```

Why: the pure function has an independently searchable file at its consumer's nearest valid utility scope.

## Incorrect — Independently Imported Constant in a Leaf File

```ts
// src/features/billing/constants/max-retries.ts
export const maxRetries = 3;
```

Why: extracted constants are collected directly in their scope's registration index instead of creating one leaf file per value.

## Correct — Independently Imported Constants in `constants/index.ts`

```ts
// src/features/billing/constants/index.ts
export const maxRetries = 3;
export const retryDelayMs = 1_000;
```

Why: the scope has one stable constants module with named exports and no redundant leaf files.
