# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one module and leaves single-use values close to their consumer.

- A constant MUST stay in the file that uses it until another file imports it.
- Extracted constants MUST live in a `constants/` folder at the closest common folder (CCF) of their consumers and be named-exported from its `index.ts`.
- When calculating a constant's CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a constant's CCF is `src/features/`, it MUST move to `src/constants/`.
- An app-wide constant that does not belong to a feature, composition, or shared component MUST live in `src/constants/`.
- If only some constants from a grouped file need a new placement, those constants MUST be split into their own file before moving.

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

## Incorrect — Composition Makes a Constant Shared

```tsx
// src/compositions/BillingDashboard.tsx
import { overdueLabel } from "@/shared/constants";
```

Why: a composition import changes the constant's location even though the billing feature defines its use.

## Correct — Composition Does Not Change the Constant's Scope

```ts
// src/features/billing/constants/index.ts
export const overdueLabel = "Overdue";
```

```tsx
// src/compositions/BillingDashboard.tsx
import { overdueLabel } from "@/features/billing/constants";
```

Why: the composition import is ignored, so the constant stays in the billing feature.
