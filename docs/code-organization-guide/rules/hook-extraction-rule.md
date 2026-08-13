# Hook Extraction Rule

Keeping every hook inline makes components bloated, while extracting every hook adds indirection without benefit. This rule defines concrete reuse and imperative-complexity triggers for extraction.

- A custom hook MUST be extracted to its own file when two or more consumers use it.
- A custom hook with exactly one consumer MUST be extracted when it contains two or more imperative categories and can be described as one coherent behavior.
- The imperative categories MUST be subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle.
- Subscriptions MUST include event listeners and registration or cleanup APIs such as `on()` and `off()`.
- External I/O and persistence MUST include network requests, asynchronous reads or writes, and browser storage.
- DOM manipulation MUST include imperative APIs such as `focus()`, `classList`, observers, or imperative rendering.
- Resource lifecycle MUST include setup and teardown APIs such as `load()`, `destroy()`, `dispose()`, or `getState()`.
- A single-use custom hook below the two-category threshold MUST stay inline in its consuming component file.

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

## Incorrect — Simple Single-Use Hook Extracted

```ts
// src/features/billing/hooks/use-invoice-sort.ts
export function useInvoiceSort(invoices: Invoice[]): Invoice[] {
  return useMemo(() => invoices.toSorted(byDate), [invoices]);
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
