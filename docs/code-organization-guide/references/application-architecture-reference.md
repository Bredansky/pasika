# Application Architecture Reference

Use this reference to look up the canonical shape of the repository's `src/` tree and the directional dependency rule between layers.

## Layer Model

`src/` has four layers: `app`, `compositions`, `features`, and `shared`. Layers import from lower layers and within their own layer; features never import other features.

Components live directly in a layer by default. Only exclusive children create a component folder, which then holds its private support files.

| Layer          | Path                      | Permitted contents                                                                                                                                                                                                                                                                                         | Imports from                         |
| -------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `app`          | `src/app/<route>/`        | [Next.js App Router Routing Files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files)                                                                                                                                                                                            | compositions, features, shared, root |
| `compositions` | `src/compositions/`       | Components and layer-scoped support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`)                                                                                                                                                                                                          | compositions, features, shared, root |
| `features`     | `src/features/<feature>/` | Feature components and support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`). `src/features/` itself holds feature folders only — never components or support folders | same feature, shared, root           |
| `shared`       | `src/shared/`             | Components and layer-scoped support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`)                                                                                                                                                                                                          | shared, root                         |
| `root`         | `src/`                    | App-wide support files (`hooks/`, `types/`, `schemas/`, `constants/`, `utils/`), `locales/`, and `config/`                                                                                                                                                                                                 | —                                    |

## Application Structure

This tree shows the canonical directory layout and naming conventions for files and folders inside `src/`. It is included so readers can verify their structure matches the project standard at a glance.

```
src/
├── app/
│   └── <route>/                           # Next.js App Router Routing Files
├── compositions/                          # Components stay flat siblings by default
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case)
│   ├── <component-part>.tsx               # Dumb component — shared by A and B, so it stays flat too
│   ├── <NestedComponent>/                 # Smart (PascalCase) — or kebab-case for dumb; nested only once it gains exclusive children
│   │   ├── index.ts                       # Re-exports only the nested parent
│   │   ├── <NestedComponent>.tsx          # Smart (PascalCase) — or kebab-case for dumb
│   │   ├── <nested-part>.tsx              # Private child — not in index.ts, import by path
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
│       ├── <ComponentA>.tsx               # Smart component (PascalCase)
│       ├── <component-b>.tsx              # Dumb component (kebab-case)
│       ├── <component-part>.tsx           # Dumb component — shared by A and B, so it stays flat too
│       ├── <NestedComponent>/             # Smart (PascalCase) — or kebab-case for dumb; nested only once it gains exclusive children
│       │   ├── index.ts                   # Re-exports only the nested parent
│       │   ├── <NestedComponent>.tsx      # Smart (PascalCase) — or kebab-case for dumb
│       │   ├── <nested-part>.tsx          # Private child — not in index.ts, import by path
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
│   ├── <ComponentA>.tsx                   # Smart component (PascalCase)
│   ├── <component-b>.tsx                  # Dumb component (kebab-case)
│   ├── <component-part>.tsx               # Dumb component — shared by A and B, so it stays flat too
│   ├── <NestedComponent>/                 # Smart (PascalCase) — or kebab-case for dumb; nested only once it gains exclusive children
│   │   ├── index.ts                       # Re-exports only the nested parent
│   │   ├── <NestedComponent>.tsx          # Smart (PascalCase) — or kebab-case for dumb
│   │   ├── <nested-part>.tsx              # Private child — not in index.ts, import by path
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
├── config/                                # App-wide configuration
└── locales/                               # App-wide locale strings
    └── index.ts                           # Single locale-registration file
```
