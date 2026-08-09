# Code Organization Guide

This guide covers how to organise code in the repository's `src/` tree — placement, extraction, and style — so structure stays consistent across contributors and reviewers.

## How To Organize a Component

Use this no matter whether you are adding a new component or extracting from existing code; the steps below apply in any case.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Pick the component's placement per the [Component Placement Rule](rules/component-placement-rule.md).
3. Classify the component as smart or dumb per the [Smart vs Dumb Component Rule](rules/smart-vs-dumb-component-rule.md).
4. Keep each component file to exactly one React component per the [No Mixed Concerns Rule](rules/no-mixed-concerns-rule.md).
5. Extract interactive elements per the [Interactive Component Rule](rules/interactive-component-rule.md).
6. Extract sole-state-owner blocks per the [Sole State Owner Rule](rules/sole-state-owner-rule.md).
7. Extract repeated structures per the [Repeated Structure Rule](rules/repeated-structure-rule.md).
8. Extract nameable visual concepts per the [Nameable Visual Concept Rule](rules/nameable-visual-concept-rule.md).
9. Nest a component when it gains exclusive children per the [Folder Nesting Rule](rules/folder-nesting-rule.md).
10. Style the component's exports and imports per the [Exports and Imports Rule](rules/exports-and-imports-rule.md).
11. Keep the component's JSX clean per the [JSX Hygiene Rule](rules/jsx-hygiene-rule.md).

## How To Organize a Non-Component Artefact

Use this when organizing a hook, type, utility, schema, constant, or config value.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Pick the artefact's placement per the [Non-Component Placement Rule](rules/non-component-placement-rule.md).
3. Style the file's exports and imports per the [Exports and Imports Rule](rules/exports-and-imports-rule.md).

## How To Organize a Locale String

Use this when adding or moving user-facing text, which always lives in one registration file rather than at a computed placement.

1. Name and place the locale key per the [Locales Rule](rules/locales-rule.md).
