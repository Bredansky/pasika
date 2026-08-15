# Code Organization Guide

This guide covers how to organize code in the repository's `src/` tree — placement, extraction, and style — so structure stays consistent across contributors and reviewers.

## How To Organize a Component

Use this no matter whether you are adding a new component or extracting from existing code; the steps below apply in any case.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Pick the component's placement per the [Component Placement Rule](rules/component-placement-rule.md).
3. Classify the component as smart or dumb per the [Smart vs Dumb Component Rule](rules/smart-vs-dumb-component-rule.md).
4. Follow the [Native Prop Forwarding Rule](rules/native-prop-forwarding-rule.md) when a component wraps a native element so its native contract remains available.
5. Keep each component file to exactly one React component per the [No Mixed Concerns Rule](rules/no-mixed-concerns-rule.md).
6. Extract interactive elements per the [Interactive Component Rule](rules/interactive-component-rule.md).
7. Extract sole-state-owner blocks per the [Sole State Owner Rule](rules/sole-state-owner-rule.md).
8. Extract repeated structures per the [Repeated Structure Rule](rules/repeated-structure-rule.md).
9. Extract nameable visual concepts per the [Nameable Visual Concept Rule](rules/nameable-visual-concept-rule.md).
10. Nest a component when it gains exclusive children per the [Folder Nesting Rule](rules/folder-nesting-rule.md).
11. Style the component's exports and imports per the [Exports and Imports Rule](rules/exports-and-imports-rule.md).
12. Keep the component's JSX clean per the [JSX Hygiene Rule](rules/jsx-hygiene-rule.md).

## How To Organize a Type or Schema

Use this when adding or moving a type or schema.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Types and Schemas Rule](rules/types-and-schemas-rule.md).

## How To Organize a Constant

Use this when adding or moving a constant.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Constants Rule](rules/constants-rule.md).

## How To Organize a Utility

Use this when adding or moving a pure function.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Utilities Rule](rules/utilities-rule.md).

## How To Organize Configuration

Use this when adding or moving an application configuration object.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Configuration Rule](rules/configuration-rule.md).

## How To Organize a Custom Hook

Use this when extracting or moving a custom hook.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Hook Extraction Rule](rules/hook-extraction-rule.md).

## How To Organize a Locale String

Use this when adding or moving user-facing text.

1. Read the [Application Architecture Reference](references/application-architecture-reference.md) so the file lands in the right top-level folder.
2. Follow the [Locales Rule](rules/locales-rule.md).
