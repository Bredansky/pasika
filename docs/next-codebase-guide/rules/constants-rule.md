# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one file and leaves single-use values close to their consumer.

- A value MUST remain in its declaring component or file until another file imports it independently; it MUST then be extracted as a constant.
- Extracted constants MUST live in a `constants/` folder at the CCF of their consumers.
- Consumers MUST import an extracted constant through the `index.ts` in that constant's `constants/` folder.
- A `constants/` folder MUST either define its constants directly in `index.ts` or group related constants in files that `index.ts` named-re-exports.
- When a constant's CCF is `src/features/`, it MUST move to `src/constants/`.
- A constant MAY live in `src/config/<module>/` instead of a `constants/` folder when a developer determines that it configures application behavior and is best understood alongside the configuration that parameterizes it, even when consumers exist outside the config module.
- A constant's name MUST be `camelCase`, unless its value is a direct `process.env` read (with or without a fallback), in which case it MAY use `SCREAMING_SNAKE_CASE` instead, or a framework requires a specific name for it (for example, a Next.js route handler exported as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or `OPTIONS`). A constant computed or derived from one or more environment variables — a fallback chain, a parsed number, a template string — is not a direct read and MUST still be `camelCase`.

## Incorrect — Screaming-Case Constant for a Non-Env Value

```ts
// src/constants/index.ts
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
```

Why: `MAX_FILE_SIZE` is a literal, not an environment variable, so it must be `camelCase`.

## Correct — camelCase Constant

```ts
// src/constants/index.ts
export const maxFileSize = 20 * 1024 * 1024;
```

## Incorrect — Screaming-Case Constant Derived From an Env Variable

```ts
// src/config/app-url/index.ts
const APP_URL_FROM_ENV = process.env.APP_URL;
export const APP_URL = APP_URL_FROM_ENV ?? "http://localhost:3000";
```

Why: `APP_URL` is a fallback chain built from a derived value, not a direct read of `process.env.APP_URL`, so it must be `camelCase`.

## Correct — Direct Env Read Keeps Its Name, Derived Value Stays camelCase

```ts
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

// src/config/app-url/index.ts
const appUrlFromEnv = process.env.APP_URL;
export const appUrl = appUrlFromEnv ?? "http://localhost:3000";
```

Why: `WEBHOOK_SECRET` is a direct read of `process.env.WEBHOOK_SECRET`, so `SCREAMING_SNAKE_CASE` is allowed; `appUrl` is derived through the intermediate `appUrlFromEnv`, so it must be `camelCase`.

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
