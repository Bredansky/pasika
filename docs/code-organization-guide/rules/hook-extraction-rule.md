# Hook Extraction Rule

Keeping every hook inline makes components bloated, while extracting every hook adds indirection without benefit. This rule defines concrete reuse and imperative-complexity triggers for extraction.

- A custom hook MUST be extracted to its own file when two or more consumers use it.
- A custom hook with exactly one consumer MUST be extracted when it contains two or more imperative categories and can be described as one coherent behavior.
- An extracted custom hook MUST live in a `hooks/` folder at the closest common folder (CCF) of its consumers.
- When a custom hook's CCF is `src/features/`, it MUST move to `src/hooks/`.
- The imperative categories MUST be subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle.
- Each operation MUST count toward only one imperative category.
- Subscriptions MUST include event listeners and registration or cleanup APIs such as `on()` and `off()`.
- External I/O and persistence MUST include network requests, asynchronous reads or writes, and browser storage.
- DOM manipulation MUST include imperative APIs such as `focus()`, `classList`, observers, or imperative rendering.
- Resource lifecycle MUST include setup and teardown APIs such as `load()`, `destroy()`, or `dispose()`.
- A custom hook with one consumer that does not meet the two-category threshold MUST stay inline in its consumer file.

## Incorrect — Two Imperative Categories Left Inline

```tsx
// src/features/player/player.tsx
export function Player({ src }: PlayerProps): React.JSX.Element {
  useEffect(() => {
    player.on("play", handlePlay);
    player.on("pause", handlePause);
    player.load(src);

    return () => {
      player.off("play", handlePlay);
      player.off("pause", handlePause);
      player.destroy();
    };
  }, [src]);

  return <PlayerView />;
}
```

Why: one coherent player-setup behavior combines subscriptions with resource lifecycle, so leaving it inline crosses the two-category threshold.

## Correct — Complex Single-Use Hook Extracted

```ts
// src/features/player/hooks/use-player-setup.ts
export function usePlayerSetup(src: string): void {
  useEffect(() => {
    player.on("play", handlePlay);
    player.on("pause", handlePause);
    player.load(src);

    return () => {
      player.off("play", handlePlay);
      player.off("pause", handlePause);
      player.destroy();
    };
  }, [src]);
}
```

```tsx
// src/features/player/player.tsx
import { usePlayerSetup } from "./hooks/use-player-setup";

export function Player({ src }: PlayerProps): React.JSX.Element {
  usePlayerSetup(src);
  return <PlayerView />;
}
```

Why: the named hook owns the subscription and resource lifecycle for one coherent behavior, keeping the component focused on rendering.

## Incorrect — Reused Hook Kept Inline

```tsx
// src/features/billing/invoice.tsx
const useInvoiceSort = (invoices: Invoice[]): Invoice[] => {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
};

// src/features/billing/invoice-summary.tsx
const useInvoiceSort = (invoices: Invoice[]): Invoice[] => {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
};
```

Why: two components use the same hook behavior, so keeping it inline duplicates it.

## Correct — Reused Hook Extracted

```ts
// src/features/billing/hooks/use-invoice-sort.ts
export function useInvoiceSort(invoices: Invoice[]): Invoice[] {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
}
```

```tsx
// src/features/billing/invoice.tsx
import { useInvoiceSort } from "./hooks/use-invoice-sort";

// src/features/billing/invoice-summary.tsx
import { useInvoiceSort } from "./hooks/use-invoice-sort";
```

Why: the hook has two consumers, so it has its own file.

## Incorrect — Simple Single-Use Hook Extracted

```ts
// src/features/billing/hooks/use-invoice-sort.ts
export function useInvoiceSort(invoices: Invoice[]): Invoice[] {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
}
```

```tsx
// src/features/billing/invoice.tsx
import { useInvoiceSort } from "./hooks/use-invoice-sort";

export function Invoice({ invoices }: InvoiceProps): React.JSX.Element {
  const sortedInvoices = useInvoiceSort(invoices);
  return <InvoiceList invoices={sortedInvoices} />;
}
```

Why: the hook has one consumer and no imperative category, so its separate file adds indirection before an extraction trigger exists.

## Correct — Simple Single-Use Hook Inline

```tsx
// src/features/billing/invoice.tsx
const useInvoiceSort = (invoices: Invoice[]): Invoice[] => {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
};

export function Invoice({ invoices }: InvoiceProps): React.JSX.Element {
  const sortedInvoices = useInvoiceSort(invoices);
  return <InvoiceList invoices={sortedInvoices} />;
}
```

Why: the hook stays beside its sole consumer until reuse or imperative complexity provides a mechanical extraction trigger.
