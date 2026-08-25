# Application Structure Rule

Without a fixed set of folders, every contributor invents a new place for code and the layer model stops describing the repository. This rule fixes which folders exist and what each one holds.

- Application source MUST live under `src/`.
- `src/` MUST contain only the `app/`, `compositions/`, `features/`, and `shared/` folders, the root support folders, `config/`, `locales/`, and the files a framework requires at the `src` root.
- `src/features/` MUST contain only feature folders.
- A folder holding support files MUST be named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/`, matching the kind of file it holds.
- A support folder MUST NOT contain a component.
- A file that does not define a component MUST have a kebab-case name.
- A feature folder, `src/compositions/`, `src/shared/`, and a nested component folder MAY each contain support folders.

## Incorrect — Invented Top-Level Folder

```text
src/
├── app/
├── features/
├── lib/
│   └── format-date.ts
└── components/
    └── button.tsx
```

Why: `lib/` and `components/` sit beside the layer folders, so two more places now compete with `src/utils/` and `src/shared/` for the same kinds of file.

## Correct — Only Layer and Support Folders

```text
src/
├── app/
├── features/
├── shared/
│   └── button.tsx
└── utils/
    └── format-date.ts
```

Why: every folder under `src/` is either a layer or a support folder, so each kind of file has exactly one home.

## Incorrect — Support Folder Directly Under `src/features/`

```text
src/features/
├── billing/
│   └── invoice.tsx
└── utils/
    └── format-amount.ts
```

Why: `src/features/utils/` belongs to no feature, so a file placed there is shared by every feature without living in a shared layer.

## Correct — Support Folder Inside a Feature

```text
src/features/
└── billing/
    ├── invoice.tsx
    └── utils/
        └── format-amount.ts
```

Why: the support folder sits inside the feature that owns it, so its scope matches its location.

## Incorrect — Component Inside a Support Folder

```text
src/features/billing/
├── invoice.tsx
└── utils/
    ├── calculate-total.ts
    └── invoice-row.tsx
```

Why: a component sits in the folder reserved for pure functions, so the folder no longer tells a reader what kind of file it holds.

## Correct — Component Beside Its Feature's Support Folder

```text
src/features/billing/
├── invoice.tsx
├── invoice-row.tsx
└── utils/
    └── calculate-total.ts
```

Why: the component sits at the feature scope and the support folder holds only pure functions.

## Incorrect — Support File Named Like a Component

```text
src/features/billing/
├── hooks/
│   └── useInvoiceSort.ts
└── utils/
    └── formatAmount.ts
```

Why: the hook and the utility carry component casing, so a reader scanning the tree cannot tell them apart from smart component files.

## Correct — Support File Named in kebab-case

```text
src/features/billing/
├── hooks/
│   └── use-invoice-sort.ts
└── utils/
    └── format-amount.ts
```

Why: every file that does not define a component reads the same way, leaving PascalCase to mean "smart component".
