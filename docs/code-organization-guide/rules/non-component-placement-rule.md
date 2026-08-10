# Non-Component Placement Rule

Without a consistent placement strategy, shared artefacts either end up too high (polluting global scope) or too low (duplicated across consumers).

- Each artefact MUST live in its closest common folder (CCF): the nearest folder that contains all files that import it.
- When the CCF is a single feature, composition, or nested component folder, the artefact MUST live in that folder's own `utils/`, `types/`, `schemas/`, `constants/`, or `hooks/` subfolder.
- When the CCF is `src/compositions/` or `src/shared/` itself — meaning consumers are 2+ flat components of that layer — the artefact MUST live in that layer's own `utils/`, `types/`, `schemas/`, `constants/`, or `hooks/` subfolder.
- When the CCF is `src/features/` itself — meaning consumers live in 2+ different feature folders — the artefact MUST live in the corresponding `src/shared/` subfolder, because `src/features/` holds one folder per feature and MUST NOT hold support folders of its own.
- When the CCF is `src/app/` or `src/` itself, the artefact MUST live in the corresponding root folder (`src/utils/`, `src/types/`, `src/schemas/`, `src/constants/`, or `src/hooks/`), because `src/app/` holds routing files only.
- Configuration values — hardcoded application data, environment parsing, and third-party service settings — MUST live in `src/config/` regardless of CCF, and MUST NOT be duplicated into a layer-scoped or root `constants/` folder.
- If only some items from a grouped-by-domain file need to follow a new CCF, those items MUST be split into their own file before they are moved.

| Artefact                                               | Start here                                                                                                                 | File structure                      | Export                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------ |
| Utils — pure functions                                 | `utils/` next to the consumer                                                                                              | One function per file, or by domain | Direct — no barrel       |
| Types                                                  | Always imported together with the component → inline in `.tsx`; imported independently → `types/` next to the consumer     | One type per file, or by domain     | Via `types/index.ts`     |
| Schemas                                                | Always imported together with the component → inline in `.tsx`; imported independently → `schemas/` next to the consumer   | One schema per file, or by domain   | Via `schemas/index.ts`   |
| Constants                                              | Always imported together with the component → inline in `.tsx`; imported independently → `constants/` next to the consumer | One constant per file, or by domain | Via `constants/index.ts` |
| Hooks — custom hooks, not React/Next.js built-ins      | Inline in the consuming file until a second consumer appears, then `hooks/` next to the consumers                          | One hook per file                   | Direct — no barrel       |
| Config — hardcoded data, env parsing, service settings | `src/config/` always — never next to the consumer                                                                          | One domain per file                 | Direct — no barrel       |

## Incorrect — type duplicated across siblings

```ts
// features/billing/Invoice.tsx — type defined inline
type DateRange = { from: Date; to: Date };

// features/billing/Payment.tsx — same type redefined
type DateRange = { from: Date; to: Date };
```

Why: `DateRange` is defined in two places. A second consumer appeared — it should have been promoted to `types/` at the CCF.

## Correct — type promoted to `types/` at the CCF

```ts
// features/billing/types/date.ts
export type DateRange = { from: Date; to: Date };

// features/billing/types/index.ts
export type { DateRange } from "./date";

// features/billing/Invoice.tsx
import { type DateRange } from "./types";

// features/billing/Payment.tsx
import { type DateRange } from "./types";
```

Why: promoted to `types/` at the CCF once a second consumer appeared. Single source of truth, re-exported via `index.ts`.

## Incorrect — cross-feature type placed in a `src/features/` support folder

```ts
// src/features/types/money.ts
export type Money = { amount: number; currency: string };

// src/features/billing/Invoice.tsx
import { type Money } from "../types";

// src/features/donation/DonationCard.tsx
import { type Money } from "../types";
```

Why: the consumers live in 2 different feature folders, so the CCF is `src/features/` itself. `src/features/` holds one folder per feature and no support folders of its own, so `src/features/types/` is not a valid placement.

## Correct — cross-feature type lifted to `src/shared/types/`

```ts
// src/shared/types/money.ts
export type Money = { amount: number; currency: string };

// src/shared/types/index.ts
export type { Money } from "./money";

// src/features/billing/Invoice.tsx
import { type Money } from "@/shared/types";

// src/features/donation/DonationCard.tsx
import { type Money } from "@/shared/types";
```

Why: the CCF is `src/features/`, which cannot hold the artefact, so it bubbles to the corresponding `src/shared/` subfolder. Both features import the single copy from `@/shared/types`.

## Incorrect — type inlined when a hook imports it independently

```tsx
// features/billing/Invoice.tsx
export type DateRange = { from: Date; to: Date };
export default function Invoice({ range }: { range: DateRange }) {
  // ...
}

// features/billing/hooks/use-billing-filter.ts
import type { DateRange } from "../Invoice"; // importing from a .tsx component file
```

Why: `DateRange` is imported by a hook independently — not always together with the component. The hook has to reach into a `.tsx` file just to get a type, creating an unnatural dependency.

## Correct — type in `types/` because it is imported independently

```ts
// features/billing/types/date.ts
export type DateRange = { from: Date; to: Date };

// features/billing/types/index.ts
export type { DateRange } from "./date";
```

```tsx
// features/billing/Invoice.tsx
import { type DateRange } from "./types";
export default function Invoice({ range }: { range: DateRange }) {
  // ...
}
```

```ts
// features/billing/hooks/use-billing-filter.ts
import { type DateRange } from "../types";
```

Why: `DateRange` is imported independently by a hook, so it lives in `types/` next to both consumers. Neither file needs to import from the other.

## Incorrect — hook promoted to `hooks/` before a second consumer exists

```ts
// features/billing/hooks/use-invoice-sort.ts
export const useInvoiceSort = () => {
  // ...
};

// features/billing/Invoice.tsx
import { useInvoiceSort } from "./hooks/use-invoice-sort"; // only consumer
```

Why: `useInvoiceSort` has exactly one consumer. Promoting it to `hooks/` adds indirection with no benefit — it should stay inline in `Invoice.tsx`.

## Correct — hook stays inline until reused

```tsx
// features/billing/Invoice.tsx
const useInvoiceSort = () => {
  // ...
};
export default function Invoice() {
  const { sorted } = useInvoiceSort();
  // ...
}
```

Why: only `Invoice.tsx` uses this hook. It stays inline. When a second consumer appears, extract it to `hooks/` at the CCF.
