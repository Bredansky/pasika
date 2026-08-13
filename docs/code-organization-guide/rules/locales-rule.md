# Locales Rule

Without a consistent structure, locale keys can hide which feature owns them and describe UI roles instead of text. This rule keeps feature locales namespaced and keys readable.

- All locales MUST live in the named `locales` object exported from `src/locales/index.ts`.
- A feature's locales MUST live in an object named after its feature folder.
- A namespaced locale MUST be read through its full dotted path (`locales.stream.watchLiveStream`).
- Locales used by `src/shared/` components or `src/compositions/` components MUST live at the top level of `locales`.
- A locale key MUST be camelCase English of the actual text content.
- A developer MAY use a stable role name when the text-derived key would be unclear or unwieldy; no mechanical length or grammar threshold applies.

## Incorrect — Flat Feature Locale Keys

```ts
// src/locales/index.ts
export const locales = {
  streamPlayerLiveText: "Дивитись прямий ефір", // role name — gives no hint what the string says
  ctaButton: "Прийняти всі cookies", // role name — gives no hint what the string says
};
```

```tsx
// src/features/stream/stream-player.tsx
locales.streamPlayerLiveText; // no namespace — collides with any other feature that picks this key
```

Why: keys describe element roles instead of text, and the flat structure does not show that `streamPlayerLiveText` belongs to the stream feature.

## Correct — Namespaced Feature Locale Keys

```ts
// src/locales/index.ts
export const locales = {
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

```

```tsx
// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream; // namespaced by feature

// src/shared/cookie-banner.tsx
locales.acceptAllCookies; // shared — read from the top level

// src/compositions/dashboard-view.tsx
locales.dashboardOverview; // composition — read from the top level
```

Why: each feature has its own namespace, while locales used by shared and composition components stay at the top level. Text-derived camelCase keys remain readable, and a stable role name is available when a text-derived key would be unclear.
