# Next Tailwind Guide

This guide keeps component styling predictable without making consumers learn a component's DOM or a project's CSS internals. It applies whenever UI styling is added or changed.

## How To Style a Component

Use this workflow when implementing a component or changing its appearance.

1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these steps use.
2. Follow the [Global Stylesheet Rule](rules/global-stylesheet-rule.md) so one stylesheet entry point owns all of the project's global CSS.
3. Follow the [Theme and Utility Definition Rule](rules/theme-and-utility-definition-rule.md) so CSS variables, Tailwind namespaces, and custom utilities expose only the intended API.
4. Follow the [Arbitrary Value Rule](rules/arbitrary-value-rule.md) so values used for the project's styling use named utilities or tokens instead of literal arbitrary classes.
5. Follow the [Class Composition Rule](rules/class-composition-rule.md) so conditional and consumer-supplied classes merge predictably.
6. Follow the [Component Variant Rule](rules/component-variant-rule.md) so supported internal appearances are a typed component API.
7. Follow the [Component UI State Rule](rules/component-ui-state-rule.md) so interaction, disabled, selected, loading, and error UI states stay coherent.
