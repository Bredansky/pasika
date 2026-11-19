# React Runtime Safety Rule

React rendering must remain pure, clickable surfaces must be keyboard-accessible, and subscriptions must avoid unnecessary teardown.

- A React component MUST NOT invoke imperative DOM methods on ref.current during render.
- A clickable non-interactive JSX surface MUST support keyboard and focus interaction.
- A useSyncExternalStore subscription MUST have a stable function identity.

## Incorrect — Impure Render and Inaccessible Interaction

```tsx
function MediaItem({ isActive }: { isActive: boolean }) {
  if (!isActive && videoRef.current) videoRef.current.pause();
  return <video ref={videoRef} />;
}

function PreviewCard({ select }: { select: () => void }) {
  return <article onClick={select}>Preview</article>;
}

function useViewport() {
  return useSyncExternalStore(
    (listener) => window.matchMedia("(max-width: 800px)").addEventListener("change", listener),
    getSnapshot,
  );
}
```

Why: imperative DOM mutations run during a possibly interrupted render, mouse-only controls are inaccessible, and recreated subscribe callbacks force external-store resubscriptions.

## Correct — Effects, Native Controls and Stable Subscriptions

```tsx
function MediaItem({ isActive }: { isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!isActive) videoRef.current?.pause();
  }, [isActive]);
  return <video ref={videoRef} />;
}

function PreviewCard({ select }: { select: () => void }) {
  return (
    <button type="button" onClick={select}>
      Select preview
    </button>
  );
}

const subscribe = (listener: () => void) => {
  const mediaQuery = window.matchMedia("(max-width: 800px)");
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
};
const getSnapshot = () => window.matchMedia("(max-width: 800px)").matches;
function useViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

Why: effects run after commit, native controls support keyboard interaction, and a stable subscription avoids unnecessary listener churn. The ESLint checks are syntactic guardrails, not a substitute for security tests, browser E2E, or React Profiler.
