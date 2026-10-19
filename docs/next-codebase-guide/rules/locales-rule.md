# Locales Rule

Translations are organized by ownership in separate dictionaries and exposed through one public `locales` object. No translation strings belong directly in `src/locales/index.ts`.

- All locales MUST be defined in named string dictionaries at `src/locales/shared.ts`, `src/locales/compositions.ts`, or `src/locales/features/<feature-name>.ts`, imported into and exposed by the exported `locales` object in `src/locales/index.ts`.
- The `locales` object MUST expose `shared` and `compositions` as distinct namespaces, and MUST NOT spread their entries into the top level.
- Locales read only by files in one feature folder MUST live in a dictionary named after the camelCase form of that feature folder (for example, `user-settings` becomes `userSettings`).
- Locales read only by files under `src/compositions/` MUST live in the `compositions` dictionary.
- Locales read by files in more than one consumer scope or by `src/shared/`, `src/app/`, `src/config/`, or root support folders MUST live in the `shared` dictionary.
- A namespaced locale MUST be read through its full dotted path (`locales.<namespace>.<key>`).
- Consumers MUST import translations through `src/locales/index.ts`, not directly from dictionary modules.
- A locale dictionary MUST contain only direct static string entries, with no nested locale objects, dynamic expressions, or unrelated declarations.
- User-facing strings outside `src/locales/` MUST be read from the public `locales` object instead of defined inline in JSX, props, toast calls, or component dictionaries.
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
