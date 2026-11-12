# Dead Code Rule

Existing TypeScript/ESLint checks catch unused local bindings and imports; this rule checks statically unused internal application exports across files.

- An internal application export with no consumers MUST be removed or kept private when locally used.

## Incorrect — Dead Internal Export

```tsx
// src/features/home/home.tsx
export const unusedCount = 3;

export function Home() {
  return <main>Home</main>;
}
```

## Correct — Keep Only Consumed Exports

```tsx
// src/features/home/home.tsx
export function Home() {
  return <main>Home</main>;
}
```

Why: An unused export exposes dead code, regardless of its name or type; framework entry points and published library APIs are excluded, and type/schema exports follow their existing ownership rule.
