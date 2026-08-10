# Component Placement Rule

Without a consistent placement strategy, shared components either end up too high (polluting global scope) or too low (duplicated across consumers). This rule defines where each component belongs in the project, and which folders may import from which.

- A component MUST live in the closest common folder of all its consumers (CCF). This process is also known as bubbling.
- A component that imports from two or more feature folders MUST live at `src/compositions/`, whatever its consumers' CCF resolves to. Such a file is, by definition, a composition.
- If the CCF of every consumer is `src/` itself, or crosses two or more feature folders under `src/features/`, and the component does not import from two or more feature folders, the component MUST live at `src/shared/`.
- If the CCF of every consumer is `src/app/`, the component MUST live at `src/compositions/`, because `src/app/` holds routing files only.
- A component that imports from exactly one feature folder other than the one it lives in MUST NOT be promoted to `src/compositions/`, because composing a single feature is not a composition. Instead, either the imported component MUST be lifted to `src/shared/`, or the importing component MUST move into the feature it imports from — whichever its own CCF allows.
- A Next.js routing file (`page.tsx`, `layout.tsx`, etc.) MUST live at `src/app/`. For route conventions see the [Next.js routing docs](https://nextjs.org/docs/app/building-your-application/routing).
- Routing files in `src/app/` MAY import components from `src/compositions/`, from `src/features/`, or from `src/shared/`.
- Components in `src/compositions/` MAY import components from `src/features/`, from `src/shared/`, or from sibling components within `src/compositions/`. They MUST NOT import from `src/app/`.
- Components in `src/features/<feature>/` MAY import components from `src/shared/` or from sibling components within the same feature. They MUST NOT import from another feature, `src/compositions/`, or `src/app/`.
- Components in `src/shared/` MAY import components only from sibling components within `src/shared/`. They MUST NOT import from `src/compositions/`, `src/features/`, or `src/app/`.
- Every cross-feature and per-layer import constraint above MUST be enforced with ESLint, not left to code review.

## Incorrect — Cross-Top-Level Component Inside One Feature

```text
src/features/billing/
  ModalShell.tsx
src/features/home/
  HomePanel.tsx
src/compositions/
  Dashboard.tsx
src/app/<route>/
  page.tsx
```

```ts
// src/features/home/HomePanel.tsx
import ModalShell from "@/features/billing/ModalShell";

// src/compositions/Dashboard.tsx
import ModalShell from "@/features/billing/ModalShell";

// src/app/<route>/page.tsx
import ModalShell from "@/features/billing/ModalShell";
```

Why: three top-level folders import `ModalShell.tsx`, but it lives under `src/features/billing/`. CCF resolves to `src/`, which places the component at `src/shared/ModalShell.tsx`. Leaving it under `src/features/billing/` makes two of its three importers reach across top-level folders to find it.

## Correct — Cross-Top-Level Component at `src/shared/`

```text
src/features/home/
  HomePanel.tsx
src/compositions/
  Dashboard.tsx
src/app/<route>/
  page.tsx
src/shared/
  ModalShell.tsx
```

```ts
// src/features/home/HomePanel.tsx
import ModalShell from "@/shared/ModalShell";

// src/compositions/Dashboard.tsx
import ModalShell from "@/shared/ModalShell";

// src/app/<route>/page.tsx
import ModalShell from "@/shared/ModalShell";
```

Why: importers span three top-level folders, so CCF resolves to `src/` itself, placing the component at `src/shared/ModalShell.tsx`. Each importer reaches it from `@/shared/ModalShell`.

## Incorrect — Same-Feature Sibling Moved to `src/shared/`

```text
src/features/billing/
  Invoice.tsx
  Payment.tsx
src/shared/
  status-badge.tsx
```

```ts
// src/features/billing/Invoice.tsx
import StatusBadge from "@/shared/status-badge";

// src/features/billing/Payment.tsx
import StatusBadge from "@/shared/status-badge";
```

Why: both importers live inside `src/features/billing/`. CCF resolves to `src/features/billing/` itself — placing it in `src/shared/` violates CCF even though two siblings import it.

## Correct — Same-Feature Sibling Stays Inside the Feature

```text
src/features/billing/
  Invoice.tsx
  Payment.tsx
  status-badge.tsx
```

```ts
// src/features/billing/Invoice.tsx
import StatusBadge from "./status-badge";

// src/features/billing/Payment.tsx
import StatusBadge from "./status-badge";
```

Why: both importers live inside `src/features/billing/`, so CCF resolves there. The component lives next to its consumers inside the feature — no relocation to `src/shared/`.

## Incorrect — Cross-Feature Dumb Component Duplicated Per Feature

```text
src/features/donation/
  DonationCard.tsx
  status-badge.tsx
src/features/stream/
  StreamCard.tsx
  status-badge.tsx
```

```ts
// src/features/donation/DonationCard.tsx
import StatusBadge from "./status-badge";

// src/features/stream/StreamCard.tsx
import StatusBadge from "./status-badge";
```

Why: one feature cannot import from another, so `status-badge.tsx` can't sit in just one feature and be shared with the other — it gets duplicated instead. CCF crosses `src/features/donation/` and `src/features/stream/`, which is not a valid placement for either feature.

## Correct — Cross-Feature Dumb Component Lifted to `src/shared/`

```text
src/features/donation/
  DonationCard.tsx
src/features/stream/
  StreamCard.tsx
src/shared/
  status-badge.tsx
```

```ts
// src/features/donation/DonationCard.tsx
import StatusBadge from "@/shared/status-badge";

// src/features/stream/StreamCard.tsx
import StatusBadge from "@/shared/status-badge";
```

Why: CCF crosses 2 feature folders, which places the component at `src/shared/status-badge.tsx`. Both features import the single copy instead of duplicating it.

## Incorrect — Multi-Feature Component Inside One Feature

```text
src/features/billing/
  BillingAggregateView.tsx
  BillingPanel.tsx
src/features/home/
  HomeBanner.tsx
```

```ts
// src/features/billing/BillingAggregateView.tsx
import BillingPanel from "./BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: `BillingAggregateView.tsx` lives in `src/features/billing/` but imports `HomeBanner` from `src/features/home/`, so it imports from 2 distinct feature folders. That is enough to make it a composition, which cannot stay inside either feature.

## Correct — Multi-Feature Component Lifted to `src/compositions/`

```text
src/features/billing/
  BillingPanel.tsx
src/features/home/
  HomeBanner.tsx
src/compositions/
  BillingAggregateView.tsx
```

```ts
// src/compositions/BillingAggregateView.tsx
import BillingPanel from "@/features/billing/BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: it imports from 2 distinct feature folders, which places the file at `src/compositions/`.

## Incorrect — Component Reaching Into a Single Foreign Feature

```text
src/features/billing/
  Invoice.tsx
  invoice-totals.tsx
src/features/home/
  amount-label.tsx
```

```ts
// src/features/billing/invoice-totals.tsx
import AmountLabel from "@/features/home/amount-label";

// src/features/billing/Invoice.tsx
import InvoiceTotals from "./invoice-totals";
```

Why: `invoice-totals.tsx` imports from exactly one foreign feature (`src/features/home/`), which no component inside a feature is allowed to do. Promoting it to `src/compositions/` does not fix this: composing a single feature is not a composition, and `Invoice.tsx` would then have to import from `src/compositions/`, which is also forbidden.

## Correct — Single-Foreign-Feature Import Lifted to `src/shared/`

```text
src/features/billing/
  Invoice.tsx
  invoice-totals.tsx
src/shared/
  amount-label.tsx
```

```ts
// src/features/billing/invoice-totals.tsx
import AmountLabel from "@/shared/amount-label";

// src/features/billing/Invoice.tsx
import InvoiceTotals from "./invoice-totals";
```

Why: `invoice-totals.tsx` is consumed only inside `src/features/billing/`, so its own CCF keeps it in that feature and it stays out of `src/compositions/`. The single foreign import is what moves: `amount-label.tsx` is generic, so it is lifted to `src/shared/` and the cross-feature import disappears.
