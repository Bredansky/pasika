# External Store Subscription Rule

React external-store subscriptions should preserve their callback identity across renders so that listeners are not repeatedly torn down and reattached.

- A useSyncExternalStore subscription MUST have a stable function identity.

## Incorrect — Recreated Subscription

```tsx
function useViewport() {
  return useSyncExternalStore((listener) => {
    const query = window.matchMedia("(max-width: 800px)");
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, getSnapshot);
}
```

Why: the inline subscribe function changes identity on every render, triggering unnecessary resubscription.

## Correct — Stable Subscription

```tsx
const subscribe = (listener: () => void) => {
  const query = window.matchMedia("(max-width: 800px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const getSnapshot = () => window.matchMedia("(max-width: 800px)").matches;

function useViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

Why: the module-level subscribe function has stable identity, so React can keep the same listener until needed.
