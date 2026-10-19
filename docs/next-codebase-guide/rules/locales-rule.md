# Locales Rule

Scattered user-facing strings obscure reuse and make placement inconsistent. Keep strings used outside one feature flat and strings used only within one feature namespaced behind one public `locales` object.

- User-facing locales MUST be defined as direct static string entries in named dictionaries under `src/locales/`: `global.ts` for shared or non-feature consumers and `<feature-name>.ts` for feature-only consumers, with no nested objects, dynamic values, or unrelated declarations.
- A locale used only under one `src/features/<feature-name>/` folder MUST belong to that feature namespace, even when used in multiple files. A locale used across features or anywhere outside that folder MUST be global. Identical text in different dictionaries MUST be consolidated into one global key rather than duplicated.
- `src/locales/index.ts` MUST assemble and export one `locales` object, spreading the `global` dictionary into top-level keys and exposing feature dictionaries by their camelCase names (e.g., `user-settings` → `userSettings`), without defining translation strings inline.
- Consumers MUST import through `src/locales/index.ts` and read `locales.<key>` or `locales.<feature>.<key>` directly. User-facing strings outside `src/locales/` MUST use these paths instead of inline literals in JSX, props, toasts, or component dictionaries.
- A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.

## Incorrect — Inline Locale Definitions

```ts
// src/locales/index.ts
export const locales = {
  cancel: "Cancel",
  stream: { watchLiveStream: "Watch live" },
};
```

Why: the public index defines translations instead of importing dictionaries.

## Correct — Flat Global Labels And Feature Dictionaries

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
