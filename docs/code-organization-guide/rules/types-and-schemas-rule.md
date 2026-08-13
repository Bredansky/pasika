# Types and Schemas Rule

Types and schemas should stay with the component that uses them until they are needed separately. This rule extracts them at that point and gives them a consistent location and public import path.

- A type or schema MUST stay inline in its component file while no consumer imports it independently of that component.
- A type or schema used only by a configuration object MUST stay with that object in `src/config/`.
- An extracted type or schema MUST live in the closest common folder (CCF) of its consumers.
- When calculating a type or schema's CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a type or schema's CCF is `src/features/`, it MUST move to the matching folder in `src/shared/`.
- An app-wide type or schema that does not belong to a feature, composition, or shared component MUST live in `src/types/` or `src/schemas/`.
- Types and schemas MUST use leaf files plus a named-export `index.ts` barrel at their CCF.
- A type or schema leaf file MUST use the kebab-case form of its export name; a grouped file MUST use a clear kebab-case name for its exports.
- If only some exports from a grouped type or schema file need a new placement, those exports MUST be split into their own file before moving.

## Incorrect — Composition Changes a Feature Type's CCF

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

```tsx
// src/compositions/BillingDashboard.tsx
import type { InvoiceStatus } from "@/types/billing";
```

Why: a composition using a billing type does not make that type app-wide.

## Correct — Feature Type Remains in Its Feature

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

```tsx
// src/compositions/BillingDashboard.tsx
import type { InvoiceStatus } from "@/features/billing/types";
```

Why: the type stays in the billing feature even when a composition imports it.

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

Why: the hook reaches into a component file for a type it uses independently.

## Correct — Independently Used Type Extracted

```ts
// src/features/billing/types/date-range.ts
export type DateRange = { from: Date; to: Date };

// src/features/billing/types/index.ts
export type { DateRange } from "./date-range";

// src/features/billing/hooks/use-billing-filter.ts
import { type DateRange } from "../types";
```

Why: the component and hook can use the billing feature's type barrel independently.
