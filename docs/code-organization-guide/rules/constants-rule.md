# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one module and leaves single-use values close to their consumer.

- A constant MUST stay in the file that uses it until another file imports it.
- Extracted constants MUST live in a `constants/` folder at the closest common folder (CCF) of their consumers and be named-exported from its `index.ts`.
- Constants that describe one concept MAY be grouped in one file and named-re-exported from `constants/index.ts`.
- When a constant's CCF is `src/features/`, it MUST move to `src/constants/`.

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
