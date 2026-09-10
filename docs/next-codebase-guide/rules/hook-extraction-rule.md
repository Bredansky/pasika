# Hook Extraction Rule

Keeping every hook inline makes components bloated, while extracting every hook adds indirection without benefit. This rule defines concrete reuse and imperative-complexity triggers for extraction.

- A custom hook MUST be extracted to its own file when two or more consumers use it.
- A custom hook with exactly one consumer MUST be extracted when its extraction score reaches two and it can be described as one coherent behavior.
- An extracted custom hook MUST live in a `hooks/` folder at the CCF of its consumers.
- When a custom hook's CCF is `src/features/`, it MUST move to `src/hooks/`.
- A custom hook with one consumer whose extraction score is below two MUST stay inline in its consumer file.

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

Why: the hook calls `useEffect`, subscribes to player events (`player.on`/`player.off`), and manages the player's resource lifecycle (`player.load`/`player.destroy`) — three distinct imperative categories. The first counts for free; each one after it counts, so this scores 2 and crosses the threshold.

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

Why: the named hook still combines subscriptions and resource lifecycle around `useEffect` for one coherent behavior, keeping the component focused on rendering; extracting it doesn't change the extraction score, only where it's counted.

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

Why: the hook has one consumer and calls only one built-in hook (`useMemo`), which counts for free and scores zero, so its separate file adds indirection before an extraction trigger exists.

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

## Incorrect — Two Distinct Hooks Extracted Before They're Enough

```ts
// src/features/player/hooks/use-player-volume.ts
export function usePlayerVolume(src: string): RefObject<HTMLVideoElement | null> {
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log("volume src changed", src);
  }, [src]);

  return playerRef;
}
```

Why: `useRef` and `useEffect` are two distinct built-in hooks, and one of them always counts for free, so this scores 1 — one short of the extraction-score threshold of two. Common pairs like this are ordinary hook usage, not evidence of a hook doing too much, and neither call performs any of the four kinds of imperative work that would add a third category.

## Correct — Two Distinct Hooks Inline

```tsx
// src/features/player/player.tsx
export function Player({ src }: PlayerProps): React.JSX.Element {
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log("volume src changed", src);
  }, [src]);

  return <PlayerView ref={playerRef} />;
}
```

Why: scoring 1, the hook stays inline until a third distinct category — another built-in hook, a subscription, external I/O, DOM manipulation, resource lifecycle, or a second consumer — gives it a mechanical extraction trigger.
