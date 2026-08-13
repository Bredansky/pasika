# Locales Rule

When locale strings are scattered across components and constants, they are hard to find and keep consistent. This rule keeps them in one central file, puts each feature's strings together, and uses readable keys.

- All locales MUST live in the named `locales` object exported from `src/locales/index.ts`.
- A feature's locales MUST live in an object named after its feature folder.
- A namespaced locale MUST be read through its full dotted path (`locales.stream.watchLiveStream`).
- Locales used by `src/shared/` components or `src/compositions/` components MUST live at the top level of `locales`.
- A locale key MUST be camelCase English based on the text, unless a direct translation would be unclear or unwieldy. In that case, it MAY describe the message's purpose instead.

## Incorrect — Flat Feature Locale Keys

```ts
// src/locales/index.ts
export const locales = {
  streamPlayerLiveText: "Дивитись прямий ефір", // describes the element, not the text
  ctaButton: "Прийняти всі cookies", // describes the element, not the text
  youSuccessfullySubscribedToUpdates: "Ви успішно підписалися на оновлення", // direct translation — unwieldy
};
```

```tsx
// src/features/stream/stream-player.tsx
locales.streamPlayerLiveText; // no namespace — collides with any other feature that picks this key
```

Why: the first two keys describe elements instead of text, the direct translation is unwieldy, and the flat structure does not show that `streamPlayerLiveText` belongs to the stream feature.

## Correct — Namespaced Feature Locale Keys

```ts
// src/locales/index.ts
export const locales = {
  stream: {
    watchLiveStream: "Дивитись прямий ефір",
  },
  acceptAllCookies: "Прийняти всі cookies", // shared — direct text-based key
  subscriptionConfirmed: "Ви успішно підписалися на оновлення", // shared — describes the message's purpose
};
```

```tsx
// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream; // namespaced by feature

// src/shared/cookie-banner.tsx
locales.acceptAllCookies; // shared — read from the top level

// src/shared/subscription-form.tsx
locales.subscriptionConfirmed; // shared — read from the top level
```

Why: the stream feature has its own namespace, while shared strings stay at the top level. `acceptAllCookies` is based on the text, while `subscriptionConfirmed` describes the message's purpose instead of using an unwieldy direct translation.
