# Locales Rule

When locale strings are scattered across components and constants, they are hard to find and keep consistent. This rule keeps them in one central file, puts each feature's strings together, and uses readable keys.

- All locales MUST live in the named `locales` object exported from `src/locales/index.ts`.
- Locales read only by files in one feature folder MUST live in an object with the camelCase form of its feature folder name (for example, `user-settings` becomes `userSettings`).
- Locales read by files in more than one feature folder or by `src/shared/`, `src/compositions/`, `src/app/`, or root support folders MUST live at the top level of `locales`.
- A namespaced locale MUST be read through its full dotted path (`locales.stream.watchLiveStream`).
- A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.

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
