# Locales Rule

When locale strings are scattered across components and constants, they are hard to find and keep consistent. This rule keeps them in one central file, puts each feature's strings together, and uses readable keys.

- All locales MUST live in the named `locales` object exported from `src/locales/index.ts`.
- A feature's locales MUST live in an object named after its feature folder.
- A namespaced locale MUST be read through its full dotted path (`locales.stream.watchLiveStream`).
- Locales used by `src/shared/` components or `src/compositions/` components MUST live at the top level of `locales`.
- A locale key MUST be camelCase English based on the text, unless a direct translation would be unclear or unwieldy. In that case, it MAY describe the element's purpose instead.

## Incorrect — Flat Feature Locale Keys

```ts
// src/locales/index.ts
export const locales = {
  streamPlayerLiveText: "Дивитись прямий ефір", // role name — gives no hint what the string says
  ctaButton: "Ви успішно підписалися на оновлення", // role name — gives no hint what the string says
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
  },
  subscriptionConfirmed: "Ви успішно підписалися на оновлення", // shared — describes the message's purpose
};
```

```tsx
// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream; // namespaced by feature

// src/shared/subscription-form.tsx
locales.subscriptionConfirmed; // shared — read from the top level
```

Why: the stream feature has its own namespace, while the shared string stays at the top level. `subscriptionConfirmed` describes the message's purpose because a direct translation would be unwieldy.
