# Component Placement Rule

Without clear placement, it is hard to tell where a component belongs and reuse can create tangled dependencies. This rule gives each component a specific place in the application structure.

- A new component with no existing consumers MUST start in the existing feature folder it belongs to, or in a new feature folder when it introduces a new feature.
- A component with existing consumers MUST live in the closest common folder (CCF) of its consumers.
- When calculating a component’s CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a component’s CCF is `src/features/`, it MUST live in `src/shared/`.
- A component that imports from two or more feature folders MUST live in `src/compositions/` and is, by definition, a composition.
- When a component’s CCF is a feature folder, `src/compositions/`, or `src/shared/`, it MUST stay flat in that folder.
- `src/app/` MUST contain [Next.js App Router routing files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files) only.
- A routing file in `src/app/` MAY import from `src/compositions/`, `src/features/`, `src/shared/`, and root support folders.
- A component in `src/compositions/` MAY import from the same folder, feature folders, `src/shared/`, and root support folders.
- A component in a feature folder MAY import from the same feature folder, `src/shared/`, and root support folders.
- A component in `src/shared/` MAY import from the same folder and root support folders.
- ESLint MUST enforce this rule’s feature and layer import restrictions.

## Incorrect — Composition Changes a Feature Component's CCF

```text
src/
├── compositions/
│   └── Dashboard.tsx
├── features/
│   └── billing/
│       ├── BillingPanel.tsx
│       └── Invoice.tsx
└── shared/
    └── BillingSummary.tsx
```

```tsx
// src/features/billing/BillingPanel.tsx
import BillingSummary from "@/shared/BillingSummary";

// src/compositions/Dashboard.tsx
import BillingSummary from "@/shared/BillingSummary";
```

Why: the composition import is included in `BillingSummary`'s CCF, moving it from the billing feature to `src/shared/`.

## Correct — Composition Does Not Change a Feature Component's CCF

```text
src/
├── compositions/
│   └── Dashboard.tsx
└── features/
    └── billing/
        ├── BillingPanel.tsx
        ├── BillingSummary.tsx
        └── Invoice.tsx
```

```tsx
// src/features/billing/BillingPanel.tsx
import BillingSummary from "./BillingSummary";

// src/compositions/Dashboard.tsx
import BillingSummary from "@/features/billing/BillingSummary";
```

Why: the composition import is ignored when calculating `BillingSummary`'s CCF, so it stays in the billing feature folder.

## Incorrect — Cross-Feature Component Duplicated

```text
src/features/
├── donation/
│   ├── DonationCard.tsx
│   └── status-badge.tsx
└── stream/
    ├── StreamCard.tsx
    └── status-badge.tsx
```

Why: two feature folders contain duplicate copies because neither feature may import from the other.

## Correct — Cross-Feature Component in `src/shared/`

```text
src/
├── features/
│   ├── donation/
│   │   └── DonationCard.tsx
│   └── stream/
│       └── StreamCard.tsx
└── shared/
    └── status-badge.tsx
```

Why: the component's CCF is `src/features/`, so it lives in `src/shared/`.

## Incorrect — Multi-Feature Composition Inside One Feature

```tsx
// src/features/billing/BillingAggregateView.tsx
import BillingPanel from "./BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: the component imports from two feature folders, so it cannot live in either feature folder.

## Correct — Multi-Feature Component in `src/compositions/`

```tsx
// src/compositions/BillingAggregateView.tsx
import BillingPanel from "@/features/billing/BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: the component imports from two feature folders, so it lives in `src/compositions/`.

## Incorrect — Ordinary Component Under `src/app/`

```text
src/app/contact/
├── _components/
│   └── contact-page-content.tsx
└── page.tsx
```

Why: the route folder contains ordinary component structure even though `src/app/` is reserved for framework routing files.

## Correct — Thin Route Imports a Page Composition

```text
src/
├── app/contact/
│   └── page.tsx
├── compositions/
│   └── contact-page-content.tsx
└── features/
    ├── contact/
    │   └── contact-information.tsx
    └── location/
        └── office-location.tsx
```

```tsx
// src/compositions/contact-page-content.tsx
import ContactInformation from "@/features/contact/contact-information";
import OfficeLocation from "@/features/location/office-location";

export default function ContactPageContent(): React.JSX.Element {
  return (
    <>
      <ContactInformation />
      <OfficeLocation />
    </>
  );
}

// src/app/contact/page.tsx
import ContactPageContent from "@/compositions/contact-page-content";

export default function Page(): React.JSX.Element {
  return <ContactPageContent />;
}
```

Why: the routing file remains thin while the page composition combines components from two feature folders.

## Incorrect — Trivial Route Wrapper Forced into a Composition

```tsx
// src/compositions/dashboard-page.tsx
import BillingFeature from "@/features/billing/BillingFeature";
import StreamFeature from "@/features/stream/StreamFeature";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div>
      <BillingFeature />
      <StreamFeature />
    </div>
  );
}
```

Why: a static wrapper around imports has no behavior or visual purpose of its own, so it does not need a composition.

## Correct — Trivial Route Assembly Without a Composition

```tsx
// src/app/dashboard/page.tsx
import BillingFeature from "@/features/billing/BillingFeature";
import StreamFeature from "@/features/stream/StreamFeature";

export default function Page(): React.JSX.Element {
  return (
    <div>
      <BillingFeature />
      <StreamFeature />
    </div>
  );
}
```

Why: a static wrapper around imported feature components keeps the route thin and does not need a composition.
