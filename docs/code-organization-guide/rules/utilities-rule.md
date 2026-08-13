# Utilities Rule

Pure functions should not be hidden in component files. This rule extracts them to a predictable `utils/` folder and keeps their imports direct.

- A pure function MUST be extracted to `utils/`, even when it has one consumer.
- An extracted utility MUST live in the closest common folder (CCF) of its consumers.
- When calculating a utility's CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a utility's CCF is `src/features/`, it MUST move to `src/shared/utils/`.
- An app-wide utility that does not belong to a feature, composition, or shared component MUST live in `src/utils/`.
- A utility MUST be imported directly without a barrel.
- A utility file MUST use the kebab-case form of its function name when it exports one function and a clear kebab-case name when it exports multiple functions.
- If only some exports from a grouped utility file need a new placement, those exports MUST be split into their own file before moving.

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
