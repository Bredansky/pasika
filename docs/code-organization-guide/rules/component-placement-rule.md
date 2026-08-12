# Component Placement Rule

Without clear placement, it is hard to tell where a component belongs and reuse can create tangled dependencies. This rule gives each component a specific place in the application structure.

- A new component with no existing consumers MUST start in the existing feature folder it belongs to, or in a new feature folder when it introduces a new feature.
- A component with existing consumers MUST live in the closest common folder (CCF) of its consumers.
- When calculating a component’s CCF, imports made by components in `src/compositions/` and routing files in `src/app/` MUST be ignored.
- When a component’s CCF is `src/features/`, it MUST live in `src/shared/`.
- A component that imports from two or more feature folders MUST live in `src/compositions/` and is, by definition, a composition.
- A route-specific UI component with no feature or shared owner MUST live in `src/compositions/`, because `src/app/` holds routing files only.
- A component used by two or more flat components within one feature, `src/compositions/`, or `src/shared/` MUST stay flat in that owning layer or feature.
- A component used only by one component MUST stay beside that consumer until exclusive children trigger folder nesting.
- A component inside one feature MUST NOT import from another feature.
- A component that imports from exactly one foreign feature MUST NOT move to `src/compositions/` merely to bypass the cross-feature restriction; the imported component MUST move to `src/shared/` when it has real cross-feature ownership, or the importing component MUST move into the feature that owns it.
- Next.js routing files such as `page.tsx`, `layout.tsx`, and `route.ts` MUST live in `src/app/` and follow their framework-required names.
- Ordinary UI components and support folders MUST NOT live anywhere under `src/app/`.
- UI routing files MAY import components from `src/compositions/`, `src/features/`, and `src/shared/`.
- UI routing files MAY contain trivial static layout markup around imported components without creating a composition.
- Components in `src/compositions/` MAY import from sibling compositions, any feature, and `src/shared/`.
- Components in `src/features/<feature>/` MAY import from siblings in the same feature and from `src/shared/`.
- Components in `src/shared/` MAY import only from siblings in `src/shared/`.
- Components outside `src/app/` MUST NOT import from `src/app/`.
- Cross-feature and per-layer import constraints MUST be enforced with ESLint rather than code review alone.
- API-route organization beyond the framework-required `route.ts` location MAY remain unspecified by this rule.

## Incorrect — Higher-Layer Consumer Promotes a Feature Component

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

Why: `BillingSummary` moved to `src/shared/` only because a composition consumes it in addition to its billing sibling, even though both uses still belong to the billing feature.

## Correct — Feature Component Keeps Directional Ownership

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
// src/compositions/Dashboard.tsx
import BillingSummary from "@/features/billing/BillingSummary";
```

Why: the higher composition may consume the billing-owned component without changing its lower-layer ownership.

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

Why: reuse across two feature folders places the component in `src/shared/` without allowing a cross-feature import.

## Incorrect — Multi-Feature Composition Inside One Feature

```tsx
// src/features/billing/BillingAggregateView.tsx
import BillingPanel from "./BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: the file combines two feature folders, so neither feature can contain it and its cross-feature import is forbidden.

## Correct — Multi-Feature Component in `src/compositions/`

```tsx
// src/compositions/BillingAggregateView.tsx
import BillingPanel from "@/features/billing/BillingPanel";
import HomeBanner from "@/features/home/HomeBanner";
```

Why: the component combines two feature folders, so it belongs in the layer allowed to import both.

## Incorrect — Ordinary UI Under `src/app/`

```text
src/app/contact/
├── _components/
│   └── contact-page-content.tsx
└── page.tsx
```

Why: the route folder contains ordinary component structure even though `src/app/` is reserved for framework routing files.

## Correct — Thin Route Imports External UI

```text
src/
├── app/contact/
│   └── page.tsx
└── compositions/
    └── contact-page-content.tsx
```

```tsx
// src/app/contact/page.tsx
import ContactPageContent from "@/compositions/contact-page-content";

export default function Page(): React.JSX.Element {
  return <ContactPageContent />;
}
```

Why: the routing file remains thin while route-specific UI has a valid external owner.

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

Why: a static wrapper with no behavior or nameable visual meaning adds a file boundary without creating a real composition.

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

Why: a static wrapper around imported feature components keeps the route thin and does not require a nameable composition of its own.
