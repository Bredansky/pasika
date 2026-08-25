# Application Architecture Reference

Use this reference to look up the repository's layer model, how the closest common folder resolves, and the canonical shape of the `src/` tree.

## Layer Model

This section lists the five layers and the direction their dependencies run. Use it to see which layer an item belongs to and which layers it draws from.

| Layer          | Path                      | Contents                                                                                                                                                                                                                                                                                     | Depends on                           |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `app`          | `src/app/`                | [Next.js App Router routing files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files), [metadata assets](https://nextjs.org/docs/app/getting-started/project-structure#metadata-file-conventions), and [styles those routing files import](https://nextjs.org/docs/app/getting-started/css) | compositions, features, shared, root |
| `compositions` | `src/compositions/`       | Components that combine two or more features, and their support folders                                                                                                                                                                                                                       | compositions, features, shared, root |
| `features`     | `src/features/<feature>/` | One folder per feature, holding that feature's components and support folders                                                                                                                                                                                                                 | same feature, shared, root           |
| `shared`       | `src/shared/`             | Components used across features, and their support folders                                                                                                                                                                                                                                    | shared, root                         |
| `root`         | `src/`                    | App-wide support folders — `hooks/`, `types/`, `schemas/`, `constants/`, `utils/` — plus `config/` and `locales/`                                                                                                                                                                              | root                                 |

## Closest Common Folder Resolution

This section works through how the closest common folder (CCF) resolves for components and for support files. Each block shows the consumers on the left and the resulting location on the right.

A component's CCF is the closest folder shared by the files that import it.

```text
src/features/payments/payment-card.tsx
src/features/payments/payment-history.tsx
└─ both import StatusBadge

CCF: src/features/payments/
Location: src/features/payments/status-badge.tsx
```

For components, imports from `src/app/` and from configuration modules drop out of the calculation, so a component used by `src/app/` and one feature resolves to that feature.

```text
src/app/products/page.tsx                ─┐
src/features/products/product-card.tsx   ─┴─ imports ProductPrice

CCF and location: src/features/products/product-price.tsx
```

A component whose only consumers are `src/app/` or configuration modules resolves to the feature it represents or supports, creating that feature folder when none exists.

```text
src/app/search/page.tsx  → SearchForm  → src/features/search/search-form.tsx

src/app/account/page.tsx ─┐
src/app/orders/page.tsx  ─┴→ AccountNav → src/features/account/account-nav.tsx
```

Consumers under `src/compositions/` count only when every consumer is under `src/compositions/`.

```text
src/compositions/checkout.tsx             ─┐
src/features/payments/payment-summary.tsx ─┴→ Total → src/features/payments/total.tsx

src/compositions/checkout.tsx ─┐
src/compositions/receipt.tsx  ─┴→ Total → src/compositions/total.tsx
```

A CCF of `src/features/` resolves to `src/shared/`, because no feature may import from another.

```text
src/features/payments/payment-card.tsx ─┐
src/features/orders/order-card.tsx     ─┴→ StatusBadge → src/shared/status-badge.tsx
```

For a support file, the CCF passes through a support folder to its parent folder, and the file lands in the matching support folder directly below that parent. A support file imported from `src/app/` resolves to the matching root support folder.

```text
src/app/products/page.tsx                    → useSearch    → src/hooks/use-search.ts
src/features/payments/hooks/use-payment.ts   → formatAmount → src/features/payments/utils/format-amount.ts
src/features/payments/payment-card.tsx       ─┐
src/features/orders/order-card.tsx           ─┴→ formatDate → src/utils/format-date.ts
```

## Application Structure

This tree shows the canonical directory layout and the naming conventions files and folders follow inside `src/`. It is included so readers can compare a repository's structure against the project standard at a glance.

```
src/
├── app/                                   # Next.js framework-convention files, assets, and route styles
├── compositions/                          # Components sit as flat siblings
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase-named)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case-named)
│   ├── <component-part>.tsx               # Dumb component shared by A and B, so it is flat too
│   ├── <NestedComponent>/                 # Component with exclusive children (PascalCase for smart, kebab-case for dumb)
│   │   ├── index.ts                       # Named re-export of the nested component
│   │   ├── <NestedComponent>.tsx          # The nested component itself
│   │   ├── <nested-part>.tsx              # Exclusive child, absent from index.ts
│   │   ├── hooks/                         # Nested-scoped support folders
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── constants/
│   │   └── utils/
│   ├── hooks/                             # Composition-scoped custom hooks
│   ├── types/                             # Composition-scoped TypeScript types
│   ├── schemas/                           # Composition-scoped validation schemas
│   ├── constants/                         # Composition-scoped constants
│   └── utils/                             # Composition-scoped pure functions
├── features/                              # One folder per feature
│   └── <feature>/                         # A feature can hold several components
│       ├── <ComponentA>.tsx               # Smart component (PascalCase-named)
│       ├── <component-b>.tsx              # Dumb component (kebab-case-named)
│       ├── <component-part>.tsx           # Dumb component shared by A and B, so it is flat too
│       ├── <NestedComponent>/             # Component with exclusive children
│       │   ├── index.ts                   # Named re-export of the nested component
│       │   ├── <NestedComponent>.tsx      # The nested component itself
│       │   ├── <nested-part>.tsx          # Exclusive child, absent from index.ts
│       │   ├── hooks/                     # Nested-scoped support folders
│       │   ├── types/
│       │   ├── schemas/
│       │   ├── constants/
│       │   └── utils/
│       ├── hooks/                         # Feature-scoped custom hooks
│       ├── types/                         # Feature-scoped TypeScript types
│       ├── schemas/                       # Feature-scoped validation schemas
│       ├── constants/                     # Feature-scoped constants
│       └── utils/                         # Feature-scoped pure functions
├── shared/                                # Components sit as flat siblings
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase-named)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case-named)
│   ├── <component-part>.tsx               # Dumb component shared by A and B, so it is flat too
│   ├── <NestedComponent>/                 # Component with exclusive children
│   │   ├── index.ts                       # Named re-export of the nested component
│   │   ├── <NestedComponent>.tsx          # The nested component itself
│   │   ├── <nested-part>.tsx              # Exclusive child, absent from index.ts
│   │   ├── hooks/                         # Nested-scoped support folders
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── constants/
│   │   └── utils/
│   ├── hooks/                             # Shared-scoped custom hooks
│   ├── types/                             # Shared-scoped TypeScript types
│   ├── schemas/                           # Shared-scoped validation schemas
│   ├── constants/                         # Shared-scoped constants
│   └── utils/                             # Shared-scoped pure functions
├── hooks/                                 # App-wide custom hooks
├── types/                                 # App-wide TypeScript types
├── schemas/                               # App-wide validation schemas
├── constants/                             # App-wide constants
├── utils/                                 # App-wide pure functions
├── config/                                # Configuration modules that centralize application behavior
│   └── <config-name>/                     # One folder per configuration module
│       ├── index.ts                       # Configuration-module entry point
│       ├── types/                         # Config-only TypeScript types
│       ├── schemas/                       # Config-only validation schemas
│       └── utils/                         # Config-only pure functions
└── locales/                               # App-wide locale strings
    └── index.ts                           # Single locale-registration file
```
