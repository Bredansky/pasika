# Utilities Rule

Pure functions should not be hidden in component files. This rule extracts them to a predictable `utils/` folder and keeps their imports direct.

- A pure function MUST be extracted to `utils/`, even when it has one consumer.
- An extracted utility MUST live in the `utils/` folder at the closest common folder (CCF) of its consumers.
- When a utility's CCF is `src/features/`, it MUST move to `src/utils/`.
- A utility MUST be imported directly without a barrel.
- A utility file that exports one function MUST use that function's kebab-case name.
- Utilities that describe one concept MAY be grouped in a kebab-case file.

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

Why: the pure function is mixed into a component file.

## Correct — Pure Function in a Directly Imported Utility File

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

Why: the function has a focused utility file in the billing feature's `utils/` folder.

## Incorrect — Shared Utility Kept in a Feature

```ts
// src/features/billing/utils/format-retry-delay.ts
export function formatRetryDelay(milliseconds: number): string {
  return `${milliseconds / 1000} seconds`;
}
```

```tsx
// src/features/billing/invoice.tsx
import { formatRetryDelay } from "./utils/format-retry-delay";

// src/compositions/billing-dashboard.tsx
import { formatRetryDelay } from "@/features/billing/utils/format-retry-delay";
```

Why: the utility is imported by both a feature and a composition, so it cannot stay in the billing feature.

## Correct — Shared Utility in `src/utils/`

```ts
// src/utils/format-retry-delay.ts
export function formatRetryDelay(milliseconds: number): string {
  return `${milliseconds / 1000} seconds`;
}
```

```tsx
// src/features/billing/invoice.tsx
import { formatRetryDelay } from "@/utils/format-retry-delay";

// src/compositions/billing-dashboard.tsx
import { formatRetryDelay } from "@/utils/format-retry-delay";
```

Why: the utility's CCF is `src/`, so it lives in `src/utils/`.
