# Locales Rule

Scattered user-facing strings obscure ownership and make reuse inconsistent. Keep universal UI labels flat and feature-specific copy in separate dictionaries behind one public `locales` object.

- User-facing locales MUST be defined as direct static string entries in named dictionaries under `src/locales/`: `global.ts` for context-independent UI labels and `<feature-name>.ts` for feature-owned text, with no nested objects, dynamic values, or unrelated declarations.
- Feature-specific copy MUST remain in its owning feature namespace regardless of where it is consumed; only context-independent UI labels MAY be global. Identical strings with independent meanings MUST remain separate.
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
locales.stream.watchLiveStream;
```

Why: global labels are accessible without a namespace, while feature ownership stays stable even when compositions consume the copy. Neither `shared` nor `compositions` needs a catch-all namespace.
