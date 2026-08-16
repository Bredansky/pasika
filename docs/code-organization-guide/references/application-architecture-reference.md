# Application Architecture Reference

Use this reference to look up the canonical shape of the repository's `src/` tree and its Layer Model.

## Layer Model

This section describes the repository's five layers and their dependency direction. Use it to decide where a component or support file belongs and which layers it can import from.

| Layer          | Path                      | Permitted contents                                                                                                                                                                     | Imports from                         |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `app`          | `src/app/`                | [Next.js App Router routing files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files), [metadata assets](https://nextjs.org/docs/app/getting-started/project-structure#metadata-file-conventions), and [styles required by routing files](https://nextjs.org/docs/app/getting-started/css) | compositions, features, shared, root |
| `compositions` | `src/compositions/`       | Components and support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`)                                                                                                  | compositions, features, shared, root |
| `features`     | `src/features/<feature>/` | Components and support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`). `src/features/` itself holds feature folders only — never components or support folders         | same feature, shared, root           |
| `shared`       | `src/shared/`             | Components and support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`)                                                                                                  | shared, root                         |
| `root`         | `src/`                    | App-wide support folders: `hooks/`, `types/`, `schemas/`, `constants/`, `utils/`, `config/`, and `locales/`                                                                          | root |

## Closest Common Folder (CCF)

The CCF determines the placement of components, hooks, types, schemas, constants, and utilities. It is the closest folder shared by the files under `src/` that use the item.

```text
src/features/payments/payment-card.tsx
src/features/payments/payment-history.tsx
└─ both import StatusBadge

CCF: src/features/payments/
Location: src/features/payments/status-badge.tsx
```

For components, imports from route files and configuration modules do not affect the CCF. A component used by a route and a feature therefore stays with the feature.

```text
src/app/products/page.tsx                ─┐
src/features/products/product-card.tsx   ─┴─ imports ProductPrice

CCF and location: src/features/products/product-price.tsx
```

A component with only route-file consumers stays in the feature it implements. When no existing feature applies, it creates a feature folder; adding more route-file consumers does not change that placement.

```text
src/app/search/page.tsx  → SearchForm  → src/features/search/search-form.tsx

src/app/account/page.tsx ─┐
src/app/orders/page.tsx  ─┴→ AccountNav → src/features/account/account-nav.tsx
```

When a component has consumers both inside and outside `src/compositions/`, only the consumers outside `src/compositions/` count. When all consumers are in `src/compositions/`, that folder counts.

```text
src/compositions/checkout.tsx             ─┐
src/features/payments/payment-summary.tsx ─┴→ Total → src/features/payments/total.tsx

src/compositions/checkout.tsx ─┐
src/compositions/receipt.tsx  ─┴→ Total → src/compositions/total.tsx
```

A component stays at a nested component folder, feature folder, `src/compositions/`, or `src/shared/`. A CCF of `src/features/` or `src/` places it in `src/shared/`.

```text
src/features/payments/payment-card.tsx ─┐
src/features/orders/order-card.tsx     ─┴→ StatusBadge → src/shared/status-badge.tsx
```

For a support file imported by a route file, use the matching root support folder, such as `src/hooks/` or `src/utils/`. Otherwise, the CCF passes through a support folder to its parent folder, and the file lives in the matching support folder directly below that parent.

```text
src/app/products/page.tsx                    → useSearch    → src/hooks/use-search.ts
src/features/payments/hooks/use-payment.ts   → formatAmount → src/features/payments/utils/format-amount.ts
src/features/payments/payment-card.tsx       ─┐
src/features/orders/order-card.tsx           ─┴→ formatDate → src/utils/format-date.ts
```

## Application Structure

This tree shows the canonical directory layout and naming conventions for files and folders inside `src/`. It is included so readers can verify their structure matches the project standard at a glance.

```
src/
├── app/                                   # Next.js framework-convention files, assets, and route styles
├── compositions/                          # Components stay flat siblings by default
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase-named)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case-named)
│   ├── <component-part>.tsx               # Dumb component — shared by A and B, so it stays flat too
│   ├── <NestedComponent>/                 # Smart (PascalCase-named) — or kebab-case-named for dumb; nested only once it gains exclusive children
│   │   ├── index.ts                       # Named-re-exports only the nested parent
│   │   ├── <NestedComponent>.tsx          # Smart (PascalCase-named) — or kebab-case-named for dumb
│   │   ├── <nested-part>.tsx              # Exclusive child — not in index.ts
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
├── features/                              # Feature folders only — no components, no support folders here
│   └── <feature>/                         # One folder per feature — a feature can hold several components
│       ├── <ComponentA>.tsx               # Smart component (PascalCase-named)
│       ├── <component-b>.tsx              # Dumb component (kebab-case-named)
│       ├── <component-part>.tsx           # Dumb component — shared by A and B, so it stays flat too
│       ├── <NestedComponent>/             # Smart (PascalCase-named) — or kebab-case-named for dumb; nested only once it gains exclusive children
│       │   ├── index.ts                   # Named-re-exports only the nested parent
│       │   ├── <NestedComponent>.tsx      # Smart (PascalCase-named) — or kebab-case-named for dumb
│       │   ├── <nested-part>.tsx          # Exclusive child — not in index.ts
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
├── shared/                                # Components stay flat siblings by default
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase-named)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case-named)
│   ├── <component-part>.tsx               # Dumb component — shared by A and B, so it stays flat too
│   ├── <NestedComponent>/                 # Smart (PascalCase-named) — or kebab-case-named for dumb; nested only once it gains exclusive children
│   │   ├── index.ts                       # Named-re-exports only the nested parent
│   │   ├── <NestedComponent>.tsx          # Smart (PascalCase-named) — or kebab-case-named for dumb
│   │   ├── <nested-part>.tsx              # Exclusive child — not in index.ts
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
