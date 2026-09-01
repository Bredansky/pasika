# Component Placement Rule

Without clear placement, it is hard to tell where a component belongs and reuse can create tangled dependencies. This rule gives each component a specific place in the application structure.

- A component that imports from two or more feature folders MUST live in `src/compositions/`.
- A component with no consumers outside `src/app/` or configuration modules, and that does not import from two or more feature folders, MUST live in the feature folder it represents or supports. If no existing feature applies, it MUST introduce a new feature folder.
- A component with at least one consumer outside `src/app/` and configuration modules MUST live in its CCF, calculated without imports from `src/app/` or configuration modules.
- When calculating a component's CCF, consumers under `src/compositions/` MUST count only when no consumer is outside `src/compositions/`.
- A component whose CCF is `src/features/` MUST live in `src/shared/`.
- `src/app/` MUST contain [Next.js App Router framework-convention files and assets](https://nextjs.org/docs/app/getting-started/project-structure#routing-files), plus styles required by routing files, but MUST NOT contain ordinary components or support folders.

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
// src/features/billing/billing-aggregate-view.tsx
import { BillingPanel } from "./BillingPanel";
import { HomeBanner } from "@/features/home/HomeBanner";
```

Why: the component imports from two feature folders, so it cannot live in either feature folder.

## Correct — Multi-Feature Component in `src/compositions/`

```tsx
// src/compositions/billing-aggregate-view.tsx
import { BillingPanel } from "@/features/billing/BillingPanel";
import { HomeBanner } from "@/features/home/HomeBanner";
```

Why: the component imports from two feature folders, so it lives in `src/compositions/`.

## Incorrect — Ordinary Component Under `src/app/`

```text
src/app/contact/
├── _components/
│   └── contact-page-content.tsx
└── page.tsx
```

Why: the route folder contains ordinary component structure even though `src/app/` is reserved for framework-convention files, assets, and styles.

## Correct — `src/app/` Imports a Page Composition

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
import { ContactInformation } from "@/features/contact/contact-information";
import { OfficeLocation } from "@/features/location/office-location";
import { locales } from "@/locales";

export function ContactPageContent(): React.JSX.Element {
  return (
    <main>
      <header>
        <h1>{locales.contactPageTitle}</h1>
        <p>{locales.contactPageDescription}</p>
      </header>
      <section>
        <h2>{locales.contactInformationHeading}</h2>
        <ContactInformation />
      </section>
      <section>
        <h2>{locales.officeLocationHeading}</h2>
        <OfficeLocation />
      </section>
    </main>
  );
}

// src/app/contact/page.tsx
import { ContactPageContent } from "@/compositions/contact-page-content";

export default function Page(): React.JSX.Element {
  return <ContactPageContent />;
}
```

Why: `src/app/` contains the routing file while the composition provides the contact page layout and combines components from two feature folders.
