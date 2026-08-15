# Types and Schemas Rule

Types and schemas are easy to bury in component files or scatter across the project. This rule keeps them close to one component and gives independently used ones a consistent location.

- A type or schema MUST stay in its component file until another file imports it without the component where it is defined. Importing it alongside that component does not trigger extraction.
- Extracted types and schemas MUST live in their matching `types/` or `schemas/` folder at the closest common folder (CCF) of their consumers and be named-re-exported from its `index.ts`.
- Types and schemas that describe one concept MAY be grouped in one file and named-re-exported from `index.ts`.
- Imports from routing files in `src/app/` MUST NOT affect a type or schema's CCF.
- When a type or schema is imported both inside and outside `src/compositions/`, its CCF MUST be calculated only from imports outside `src/compositions/`.
- When a type or schema is imported only in `src/compositions/`, its CCF MUST be calculated from those imports.
- When a type or schema's CCF is `src/features/`, it MUST move to the matching folder in `src/shared/`.
- A type or schema leaf file MUST use the kebab-case form of its export name; a grouped file MUST use a clear kebab-case name for its exports.

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
// src/features/billing/Invoice.tsx
import type { InvoiceStatus } from "@/types/billing";

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
// src/features/billing/Invoice.tsx
import type { InvoiceStatus } from "./types";

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

## Incorrect — Schema Imported Independently from a Component

```tsx
// src/features/billing/InvoiceForm.tsx
import { z } from "zod";

export const invoiceSchema = z.object({
  amount: z.number().positive(),
});
```

```ts
// src/features/billing/hooks/use-invoice-draft.ts
import { invoiceSchema } from "../InvoiceForm";
```

Why: the hook reaches into a component file for a schema it uses independently.

## Correct — Independently Used Schema Extracted

```ts
// src/features/billing/schemas/invoice.ts
import { z } from "zod";

export const invoiceSchema = z.object({
  amount: z.number().positive(),
});

// src/features/billing/schemas/index.ts
export { invoiceSchema } from "./invoice";
```

```tsx
// src/features/billing/InvoiceForm.tsx
import { invoiceSchema } from "./schemas";

// src/features/billing/hooks/use-invoice-draft.ts
import { invoiceSchema } from "../schemas";
```

Why: the component and hook can use the billing feature's schema barrel independently.
