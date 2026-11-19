# External Store Subscription Rule

`useSyncExternalStore` lets a React component read a value from something outside React (for example, the browser window) and update when that value changes. It takes two functions:

- `subscribe(onChange)` registers a listener that calls `onChange` when the value may have changed, and returns a function to remove that listener.
- `getSnapshot()` reads the current value.

React compares the **subscribe function itself** between renders. If it is a different function, React removes the old listener and registers a new one—even if the code inside the function looks identical.

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

Why: `subscribe` is defined **outside** the hook, so its function identity remains the same across renders. The listener can stay attached until the component unmounts. When the window resizes, `onChange` tells React to read `getSnapshot` again.

The rule checks for an inline function in the first argument of `useSyncExternalStore`. If a subscription needs values from the hook's arguments, use `useCallback` with the appropriate dependencies instead of moving it outside the hook.
