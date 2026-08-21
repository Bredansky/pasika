# Styling Guide

This guide keeps component styling predictable without making consumers learn a component's DOM or a project's CSS internals. It applies whenever UI styling is added or changed.

## How To Style a Component

Use this workflow when implementing a component or changing its appearance.

1. Follow the [Tailwind Utility Rule](rules/tailwind-utility-rule.md) so ordinary, local styling stays visible beside the markup it affects.
2. Follow the [Class Composition Rule](rules/class-composition-rule.md) so conditional and consumer-supplied classes merge predictably.
3. Follow the [Component Variant Rule](rules/component-variant-rule.md) so supported internal appearances are a typed component API.
4. Follow the [Component UI State Rule](rules/component-ui-state-rule.md) so interaction, disabled, selected, loading, and error UI states stay coherent.
5. Follow the [Theme Token Rule](rules/theme-token-rule.md) so application chrome, content visuals, and shared measurements use the right kind of value.
6. Follow the [Theme and Utility Definition Rule](rules/theme-and-utility-definition-rule.md) so CSS-first theme tokens, color roles, and custom utilities expose only the intended API.
7. Follow the [Global Stylesheet Rule](rules/global-stylesheet-rule.md) so one stylesheet entry point owns all project-owned global CSS.
