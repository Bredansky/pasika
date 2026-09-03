# Next Codebase Guide

This guide covers how to organize code in the repository's `src/` tree — placement, extraction, and module conventions — so structure stays consistent across contributors and reviewers.

## How To Organize a Component

1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these workflows use.
2. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
3. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
4. Pick the component's placement per the [Component Placement Rule](rules/component-placement-rule.md).
5. Classify the component as smart or dumb per the [Smart vs Dumb Component Rule](rules/smart-vs-dumb-component-rule.md).
6. Keep each component file to exactly one React component per the [No Mixed Concerns Rule](rules/no-mixed-concerns-rule.md).
7. Extract interactive elements per the [Interactive Component Rule](rules/interactive-component-rule.md).
8. Extract sole-state-owner blocks per the [Sole State Owner Rule](rules/sole-state-owner-rule.md).
9. Extract repeated structures per the [Repeated Structure Rule](rules/repeated-structure-rule.md).
10. Extract a group of elements when one clear component name describes it per the [Nameable Visual Concept Rule](rules/nameable-visual-concept-rule.md).
11. For every component extracted in steps 7 to 10, repeat steps 4 to 6.
12. Repeat steps 7 to 10 for an extracted component only when one of those extraction conditions applies to its JSX; stop when no new component is required.
13. Nest a component when it gains exclusive children per the [Folder Nesting Rule](rules/folder-nesting-rule.md).
14. Keep the component's JSX clean per the [JSX Hygiene Rule](rules/jsx-hygiene-rule.md).
15. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so every component module has predictable exports and import paths.

## How To Organize a Type or Schema

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
3. Follow the [Types and Schemas Rule](rules/types-and-schemas-rule.md) so the type or schema is extracted only once a consumer needs it independently.
4. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the type or schema module has predictable exports and import paths.

## How To Organize a Constant

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
3. Follow the [Constants Rule](rules/constants-rule.md) so the value is extracted only once a second file imports it.
4. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the constant module has predictable exports and import paths.

## How To Organize a Utility

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
3. Follow the [Utilities Rule](rules/utilities-rule.md) so the pure function gets its own file in the right `utils/` folder.
4. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the utility module has predictable exports and import paths.

## How To Organize Configuration

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
3. Follow the [Configuration Rule](rules/configuration-rule.md) so the module and the files that only support it stay together in `src/config/`.
4. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the configuration module has predictable exports and import paths.

## How To Organize a Custom Hook

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Application Structure Rule](rules/application-structure-rule.md) so the folder that holds the item is one the structure allows.
3. Follow the [Hook Extraction Rule](rules/hook-extraction-rule.md) so the hook is extracted only once reuse or imperative complexity requires it.
4. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the hook module has predictable exports and import paths.

## How To Organize a Locale String

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) to identify where the item belongs in `src/`.
2. Follow the [Locales Rule](rules/locales-rule.md) so the string is registered under the right key in `src/locales/index.ts`.
3. Follow the [Exports and Imports Rule](rules/exports-and-imports-rule.md) so the locale module has predictable exports and import paths.
