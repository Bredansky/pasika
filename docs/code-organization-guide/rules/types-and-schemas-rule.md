# Types and Schemas Rule

Types and schemas are easy to bury in component files or scatter across the project. This rule keeps them close to one component and gives independently used ones a consistent location.

- A type or schema declared in a component MUST stay in that component file until another file imports it without the component where it is defined.
- Importing a type or schema alongside the component that defines it MUST NOT require extraction.
- A type or schema declared outside a component MUST stay in its file until another file needs it without using the code in that file.
- Extracted types and schemas MUST live in their matching `types/` or `schemas/` folder at the CCF of their consumers.
- When a type or schema's CCF is `src/features/`, it MUST move to `src/types/` or `src/schemas/`.
- A `types/` or `schemas/` folder MUST either define its exports directly in `index.ts` or group related types and schemas in files that `index.ts` named-re-exports.
- Consumers MUST import an extracted type or schema through the `index.ts` in that type or schema's `types/` or `schemas/` folder.
- A type or schema used only to implement one configuration module MUST live in that module's `types/` or `schemas/` folder.
- A type MAY stay in `src/config/<module>/` when its meaning is derived from the configuration that it parameterizes, even when consumers exist outside the config module.

## Incorrect — Feature and Composition Type Kept in a Feature

```text
src/
├── compositions/
│   └── BillingDashboard.tsx
├── features/
│   └── billing/
│       ├── invoice.tsx
│       └── types/
│           ├── billing.ts
│           └── index.ts
```

```tsx
// src/features/billing/invoice.tsx
import type { InvoiceStatus } from "./types";

// src/compositions/BillingDashboard.tsx
import type { InvoiceStatus } from "@/features/billing/types";
```

Why: the feature and composition have `src/` as their CCF, but the type remains in the billing feature.

## Correct — Feature and Composition Type in `src/types/`

```text
src/
├── compositions/
│   └── BillingDashboard.tsx
├── features/
│   └── billing/
│       └── invoice.tsx
└── types/
    ├── billing.ts
    └── index.ts
```

```ts
// src/types/billing.ts
export type InvoiceStatus = "draft" | "paid";
export type PaymentMethod = "card" | "bank";

// src/types/index.ts
export type { InvoiceStatus, PaymentMethod } from "./billing";
```

```tsx
// src/features/billing/invoice.tsx
import type { InvoiceStatus } from "@/types";

// src/compositions/BillingDashboard.tsx
import type { InvoiceStatus } from "@/types";
```

Why: the feature and composition have `src/` as their CCF, so the type lives in `src/types/`.

## Incorrect — Type Imported Independently from a Component

```tsx
// src/features/billing/invoice.tsx
export type DateRange = { from: Date; to: Date };

export function Invoice({ range }: { range: DateRange }): React.JSX.Element {
  return <InvoiceView range={range} />;
}
```

```ts
// src/features/billing/hooks/use-billing-filter.ts
import type { DateRange } from "../invoice";
```

Why: the hook reaches into a component file for a type it uses independently.

## Correct — Independently Used Type Extracted

```ts
// src/features/billing/types/index.ts
export type DateRange = { from: Date; to: Date };

// src/features/billing/hooks/use-billing-filter.ts
import { type DateRange } from "../types";
```

Why: the component and hook can use the billing feature's types index independently.

## Incorrect — Schema Imported Independently from a Component

```tsx
// src/features/billing/invoice-form.tsx
import { z } from "zod";

export const invoiceSchema = z.object({
  amount: z.number().positive(),
});
```

```ts
// src/features/billing/hooks/use-invoice-draft.ts
import { invoiceSchema } from "../invoice-form";
```

Why: the hook reaches into a component file for a schema it uses independently.

## Correct — Independently Used Schema Extracted

```ts
// src/features/billing/schemas/index.ts
import { z } from "zod";

export const invoiceSchema = z.object({
  amount: z.number().positive(),
});
```

```tsx
// src/features/billing/invoice-form.tsx
import { invoiceSchema } from "./schemas";

// src/features/billing/hooks/use-invoice-draft.ts
import { invoiceSchema } from "../schemas";
```

Why: the component and hook can use the billing feature's schemas index independently.
