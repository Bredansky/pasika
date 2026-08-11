# Locales Rule

Without a consistent key convention, locale keys become a mix of role names and text content that is hard to search and easy to misread.

- All locales MUST live in `src/locales/index.ts`.
- Locales MUST be default-exported as a single `locales` object, with one nested object per feature keyed by that feature's name and never flattened into the parent, so two features can reuse the same key without colliding.
- A namespaced locale MUST be read through its full dotted path (`locales.stream.watchLiveStream`).
- Locales for shared and composition components MUST land directly in the `locales` object at the top level — no sub-object namespace.
- A locale key MUST be camelCase English of the actual text content.
- A developer MAY use a stable role name when the text-derived key would be unclear or unwieldy; no mechanical length or grammar threshold applies.

## Incorrect

```ts
// src/locales/index.ts
const stream = {
  streamPlayerLiveText: "Дивитись прямий ефір", // role name — gives no hint what the string says
};
export const locales = {
  ...stream, // spread — the stream namespace is lost
  ctaButton: "Прийняти всі cookies", // role name — gives no hint what the string says
};
```

```tsx
// src/features/stream/stream-player.tsx
locales.streamPlayerLiveText; // no namespace — collides with any other feature that picks this key
```

Why: keys describe element roles, not text content — the key `streamPlayerLiveText` gives no hint what the string says. Spreading `stream` also flattens it away, so the call site cannot tell which feature owns the string and a second feature reusing the key silently overwrites it.

## Correct

```ts
// src/locales/index.ts
const locales = {
  stream: {
    watchLiveStream: "Дивитись прямий ефір",
    openInWindow: "Відкрити у вікні",
  },
  donation: {
    recentActivity: "Остання активність",
    noResultsFound: "Результатів не знайдено",
  },
  acceptAllCookies: "Прийняти всі cookies", // shared — no feature namespace
  dashboardOverview: "Огляд панелі", // composition — no feature namespace
};

export default locales;
```

```tsx
// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream; // namespaced by feature

// src/shared/cookie-banner.tsx
locales.acceptAllCookies; // shared — read from the top level

// src/compositions/dashboard-view.tsx
locales.dashboardOverview; // composition — read from the top level
```

Why: each feature domain is a nested object keyed by its own name, so `locales.stream.watchLiveStream` names its owner at the call site and `donation` could reuse `watchLiveStream` without collision. Shared and composition strings sit at the top level because compositions are not named domains. Text-derived camelCase keys stay readable and searchable, while developer judgment handles copy that would produce an unwieldy key.
