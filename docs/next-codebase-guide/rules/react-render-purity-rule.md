# React Render Purity Rule

React components must not mutate DOM nodes during rendering, since React may render, restart, or discard work before committing it.

- A React component MUST NOT invoke imperative DOM methods on ref.current during render.

## Incorrect — Imperative DOM Call During Render

```tsx
function MediaItem({ isActive }: { isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  if (!isActive && videoRef.current) videoRef.current.pause();
  return <video ref={videoRef} />;
}
```

Why: calling `pause()` during render modifies the DOM before React commits the update.

## Correct — DOM Call in an Effect

```tsx
function MediaItem({ isActive }: { isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!isActive) videoRef.current?.pause();
  }, [isActive]);
  return <video ref={videoRef} />;
}
```

Why: the effect runs after commit, while rendering remains free of imperative DOM mutations.
