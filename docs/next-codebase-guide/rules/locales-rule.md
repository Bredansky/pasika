# Locales Rule

Scattered translations obscure ownership and make reuse inconsistent. Keep translations in ownership-based dictionaries, exposed through a single public `locales` object.

- All locales MUST live in flat, static string dictionaries at `src/locales/shared.ts`, `src/locales/compositions.ts`, or `src/locales/features/<feature-name>.ts`, with no nested objects, dynamic values, or unrelated declarations.
- Dictionary ownership MUST match its consumers: `compositions` for composition-only strings, the feature's camelCase name for feature-only strings (e.g., `user-settings` → `userSettings`), and `shared` for cross-scope strings or consumers in `src/shared/`, `src/app/`, `src/config/`, or root support folders.
- `src/locales/index.ts` MUST assemble and export these dictionaries through one `locales` object, keeping `shared`, `compositions`, and feature namespaces separate without flattening entries or defining strings inline.
- Consumers MUST import through `src/locales/index.ts` and use full `locales.<namespace>.<key>` paths. User-facing strings outside `src/locales/` MUST use these paths instead of inline literals in JSX, props, toasts, or component dictionaries.
- A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.

## Incorrect — Flattened Translations

```ts
// src/locales/index.ts
import { shared } from "./shared";

export const locales = {
  ...shared,
  stream: { watchLiveStream: "Watch live" },
};
```

Why: shared copy is flattened and translations are defined directly in the index.

## Correct — Named Dictionaries And Namespaces

```ts
// src/locales/shared.ts
export const shared = {
  cancel: "Cancel",
  subscriptionConfirmed: "Subscription confirmed",
} as const;
```

```ts
// src/locales/compositions.ts
export const compositions = {
  confirmDelete: "Delete this item?",
} as const;
```

```ts
// src/locales/features/stream.ts
export const stream = {
  watchLiveStream: "Watch live",
} as const;
```

```ts
// src/locales/index.ts
import { shared } from "./shared";
import { compositions } from "./compositions";
import { stream } from "./features/stream";

export const locales = { shared, compositions, stream } as const;
```

```tsx
// src/shared/cookie-banner.tsx
locales.shared.cancel;

// src/compositions/delete-dialog.tsx
locales.compositions.confirmDelete;

// src/features/stream/stream-player.tsx
locales.stream.watchLiveStream;
```

Why: ownership is clear from the defining file and the public namespace. The index only assembles dictionaries. The regular 300-line limit applies to every locale file, including the index.
