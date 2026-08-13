# Configuration Rule

Configuration objects centralize values that control application behavior. This rule keeps each object and the files that only support it together in `src/config/`.

- `src/config/` MUST contain configuration objects that centralize values used to control application behavior.
- A configuration object MUST use `src/config/<config-name>/index.ts`.
- A configuration object's supporting types, schemas, and utilities MUST live in their dedicated folders under `src/config/<config-name>/`.

## Incorrect — Supporting Schema Outside Its Config Folder

```text
src/config/
├── home-feed/
│   └── index.ts
└── home-feed-schema.ts
```

Why: the schema sits outside the `home-feed/` configuration folder.

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
