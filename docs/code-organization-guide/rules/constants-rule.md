# Constants Rule

Constants stay in the file that uses them until another file needs them. This rule gives extracted constants one predictable module at the right scope.

- A constant MUST stay inline in its consuming file while no consumer imports it independently.
- An extracted constant MUST live in the closest common folder (CCF) of its consumers.
- When calculating a constant's CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a constant's CCF is `src/features/`, it MUST move to `src/shared/constants/`.
- An app-wide constant that does not belong to a feature, composition, or shared component MUST live in `src/constants/`.
- Extracted constants MUST be defined directly in `constants/index.ts` at their CCF with named exports.
- If only some constants from a grouped file need a new placement, those constants MUST be split into their own file before moving.

## Incorrect — Independently Imported Constant in a Leaf File

```ts
// src/features/billing/constants/max-retries.ts
export const maxRetries = 3;
```

```ts
// src/features/billing/hooks/use-retry-payment.ts
import { maxRetries } from "../constants/max-retries";
```

Why: an extracted constant has its own leaf file instead of the feature's constants module.

## Correct — Extracted Constants in `constants/index.ts`

```ts
// src/features/billing/constants/index.ts
export const maxRetries = 3;
export const retryDelayMs = 1_000;
```

Why: the feature has one constants module with named exports and no redundant leaf files.

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
