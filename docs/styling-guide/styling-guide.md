# Styling Guide

This guide keeps component styling predictable without making consumers learn a component's DOM or a project's CSS internals. It applies whenever UI styling is added or changed.

## How To Style a Component

Use this workflow when implementing a component or changing its appearance.

1. Follow the [Tailwind Utility Rule](rules/tailwind-utility-rule.md) so ordinary, local styling stays visible beside the markup it affects.
2. Follow the [Class Composition Rule](rules/class-composition-rule.md) so conditional and consumer-supplied classes merge predictably.
3. Follow the [Component Variant Rule](rules/component-variant-rule.md) so supported internal appearances are a typed component API.
4. Follow the [Color Role Naming Rule](rules/color-role-naming-rule.md) so color utilities state whether they supply a general color, a background, readable text, or a complete surface.
5. Follow the [Theme and Utility Definition Rule](rules/theme-and-utility-definition-rule.md) so CSS-first theme tokens and custom utilities expose only the intended API.
6. Follow the [Theme Token Rule](rules/theme-token-rule.md) so application chrome, content visuals, and shared measurements use the right kind of value.
7. Follow the [Global Style System Rule](rules/global-style-system-rule.md) so global CSS has one source of truth and a clear ownership boundary.
8. Follow the [Style Placement Rule](rules/style-placement-rule.md) so reusable styling has one appropriate owner.
9. Follow the [Component State Rule](rules/component-state-rule.md) so interaction, disabled, selected, loading, and error states stay coherent.
