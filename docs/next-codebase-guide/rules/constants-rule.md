# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one file and leaves single-use values close to their consumer.

- A value MUST remain in its declaring component or file until another file imports it independently; it MUST then be extracted as a constant.
- Extracted constants MUST live in a `constants/` folder at the CCF of their consumers.
- Consumers MUST import an extracted constant through the `index.ts` in that constant's `constants/` folder.
- A `constants/` folder MUST either define its constants directly in `index.ts` or group related constants in files that `index.ts` named-re-exports.
- When a constant's CCF is `src/features/`, it MUST move to `src/constants/`.
- A constant MAY live in `src/config/<module>/` instead of a `constants/` folder when a developer determines that it configures application behavior and is best understood alongside the configuration that parameterizes it, even when consumers exist outside the config module.
- A constant's name MUST be `camelCase`, unless a framework requires a specific name for it (for example, a Next.js route handler exported as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or `OPTIONS`).
- A fixed set of named string or number values MUST be a TypeScript `enum` instead of an object literal marked `as const`.

## Incorrect — Screaming-Case Constant for an Ordinary Value

```ts
// src/constants/index.ts
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
```

Why: `MAX_FILE_SIZE` is a plain value with no framework requirement on its name, so it must be `camelCase`.

## Correct — camelCase Constant

```ts
// src/constants/index.ts
export const maxFileSize = 20 * 1024 * 1024;
```

## Incorrect — `as const` Object for a Fixed Set of Values

```ts
// src/constants/index.ts
const languageLabels = { ua: "UA", ru: "RU", en: "EN" } as const;
```

Why: `languageLabels` maps fixed keys to literal string values, which is exactly what an `enum` expresses; an `as const` object hides that intent behind a generic literal type.

## Correct — `enum` for a Fixed Set of Values

```ts
// src/constants/index.ts
enum LanguageLabel {
  Ukrainian = "UA",
  Russian = "RU",
  English = "EN",
}
```

Why: `LanguageLabel` states its closed set of values as an `enum`, matching the constant's actual shape.

## Incorrect — Renaming a Framework-Required Export

```ts
// src/app/api/posts/route.ts
export const httpGet = async () => new Response();
```

Why: Next.js requires the exact name `GET` for this export to be recognized as a route handler.

## Correct — Framework-Required Name Kept As Is

```ts
// src/app/api/posts/route.ts
export const GET = async () => new Response();
```

Why: `GET` is the name Next.js requires for a route handler; every other constant still uses `camelCase`.

## Incorrect — Constant Imported Without `constants/index.ts`

```ts
// src/features/billing/constants/max-retries.ts
export const maxRetries = 3;
```

```ts
// src/features/billing/hooks/use-retry-payment.ts
import { maxRetries } from "../constants/max-retries";
```

Why: the consumer bypasses the feature's `constants/index.ts`.

## Correct — Grouped Constants Re-Exported from `constants/index.ts`

```ts
// src/features/billing/constants/retry.ts
export const maxRetries = 3;
export const retryDelayMs = 1_000;

// src/features/billing/constants/index.ts
export { maxRetries, retryDelayMs } from "./retry";
```

```ts
// src/features/billing/hooks/use-retry-payment.ts
import { maxRetries } from "../constants";
```

Why: the constants are available through the feature's `constants/index.ts`.

## Incorrect — Feature and Composition Constant Kept in a Feature

```ts
// src/features/billing/constants/index.ts
export const paymentRetryDelayMs = 1_000;

// src/features/billing/hooks/use-retry-payment.ts
import { paymentRetryDelayMs } from "../constants";

// src/compositions/BillingDashboard.tsx
import { paymentRetryDelayMs } from "@/features/billing/constants";
```

Why: the feature and composition have `src/` as their CCF, but the constant remains in the billing feature.

## Correct — Feature and Composition Constant in `src/constants/`

```ts
// src/constants/index.ts
export const paymentRetryDelayMs = 1_000;
```

```tsx
// src/features/billing/hooks/use-retry-payment.ts
import { paymentRetryDelayMs } from "@/constants";

// src/compositions/BillingDashboard.tsx
import { paymentRetryDelayMs } from "@/constants";
```

Why: the feature and composition have `src/` as their CCF, so the constant lives in `src/constants/`.
