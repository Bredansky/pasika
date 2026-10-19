# Locales Rule

Keep user-facing text in `src/locales/` and use one `locales` object to access it. Choose the dictionary based on where the text is used.

- User-facing text MUST be stored as static strings in flat dictionaries directly under `src/locales/`, with no nested objects, dynamic values, or unrelated declarations. Code MUST import through `src/locales/index.ts` and use `locales.<key>` or `locales.<feature>.<key>` instead of inline text in JSX, props, toasts, or component dictionaries.
- Text used only in one feature MUST go in that feature's dictionary. Text used outside that feature MUST go in `global.ts`. Identical text MUST NOT appear in multiple dictionaries.
- `src/locales/index.ts` MUST import the dictionaries and export one `locales` object, with global keys at the top level and feature dictionaries under their camelCase names. It MUST NOT define translation strings directly.
- Locale keys MUST use English camelCase. Keys longer than 30 characters MUST describe the text's purpose and end with a WAI-ARIA role such as `Button`, `Link`, or `Dialog`.

## Incorrect — Inline Locale Definitions

```ts
// src/locales/index.ts
export const locales = {
  cancel: "Cancel",
  stream: { watchLiveStream: "Watch live" },
};
```

Why: the public index defines translations instead of importing dictionaries.

## Correct — Global And Feature Dictionaries

```ts
// src/locales/global.ts
export const global = {
  cancel: "Cancel",
  nextStream: "Next stream",
} as const;
```

```ts
// src/locales/stream.ts
export const stream = {
  watchLiveStream: "Watch live",
} as const;
```

```ts
// src/locales/index.ts
import { global } from "./global";
import { stream } from "./stream";

export const locales = { ...global, stream } as const;
```

```tsx
// src/shared/cookie-banner.tsx
locales.cancel;

// src/compositions/stream-page-content.tsx
locales.nextStream;

// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream;
```

Why: consumer locations determine placement: stream-only strings stay in `stream`, while strings used in compositions or other scopes are global. No separate `shared` or `compositions` namespace is needed. User-facing text includes accessibility labels and UI errors; technical logs, API-only errors, and mock data do not need localization unless shown to users.
