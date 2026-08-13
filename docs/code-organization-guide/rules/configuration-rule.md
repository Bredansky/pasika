# Configuration Rule

Configuration objects centralize values that control application behavior. This rule keeps each object and the files that only support it together in `src/config/`.

- A configuration object that centralizes values used to control application behavior MUST live in `src/config/`.
- A configuration object with supporting types, schemas, or utilities MUST use one dedicated folder under `src/config/`.

## Incorrect — Supporting Schema Outside Its Config Folder

```text
src/config/
├── home-feed.ts
└── home-feed-schema.ts
```

Why: the configuration object and its schema are separate files without a dedicated folder to group them.

## Correct — Configuration Object with Its Supporting Schema

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

Why: the configuration object and its supporting schema are grouped under one dedicated folder.
