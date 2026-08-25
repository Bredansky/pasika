# Configuration Rule

Configuration modules centralize values that control application behavior. This rule keeps each module and the files that only support it together in `src/config/`.

- All configuration modules MUST live in `src/config/`.
- A configuration module MUST be one `src/config/<config-name>/` folder with `index.ts` as its entry point.
- A type, schema, or utility used only to implement one configuration module MUST be extracted even with one consumer.
- An extracted configuration type, schema, or utility MUST live in its matching dedicated folder under `src/config/<config-name>/`.
- An extracted configuration type, schema, or utility MUST move to its matching root support folder when a consumer outside its configuration module imports it.

## Incorrect — Supporting Schema Outside Its Config Folder

```text
src/config/
├── home-feed/
│   └── index.ts
└── home-feed-schema.ts
```

Why: the schema sits outside the `home-feed/` configuration folder.

## Correct — Configuration Module with Its Supporting Schema

```text
src/config/
└── home-feed/
    ├── index.ts
    └── schemas/
        └── index.ts
```

```ts
// src/config/home-feed/index.ts
import { homeFeedConfigSchema } from "./schemas";

export const homeFeedConfig = homeFeedConfigSchema.parse({
  freshVideoMaxAgeDays: 7,
});
```

Why: the configuration module and its supporting schema are grouped in the same configuration folder.
