# External Store Subscription Rule

`useSyncExternalStore` reads a value outside React and updates when it changes: `subscribe(onChange)` registers a listener and returns its cleanup, while `getSnapshot()` reads the current value. React compares the **subscribe function itself** between renders and replaces the listener when the function identity changes.

- A useSyncExternalStore subscription MUST have a stable function identity.

## Incorrect — New Subscribe Function on Every Render

```tsx
const getSnapshot = () => window.innerWidth < 800;
const getServerSnapshot = () => false;

function useIsNarrowScreen() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    getSnapshot,
    getServerSnapshot,
  );
}
```

Why: the arrow function passed as the **first argument** is created again every time `useIsNarrowScreen` renders. React treats it as a changed subscription and unnecessarily removes and re-adds the resize listener.

## Correct — Reuse the Same Subscribe Function

```tsx
const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

const getSnapshot = () => window.innerWidth < 800;
const getServerSnapshot = () => false;

function useIsNarrowScreen() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

Why: `subscribe` is defined **outside** the hook, so its identity remains stable across renders and the listener stays attached. When the window resizes, `onChange` tells React to read `getSnapshot` again; if subscription logic depends on hook arguments, use `useCallback` with appropriate dependencies.
