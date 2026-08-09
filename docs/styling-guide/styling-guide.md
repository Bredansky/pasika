# Styling Guide

This guide keeps component styling predictable without making consumers learn a component's DOM or a project's CSS internals. Use it whenever you add or change UI styling.

## How To Style a Component

Use this workflow when implementing a component or changing one of its visual treatments.

1. Follow the [Tailwind Utility Rule](rules/tailwind-utility-rule.md) so ordinary, local styling stays visible beside the markup it affects.
2. Follow the [Class Composition Rule](rules/class-composition-rule.md) so conditional and consumer-supplied classes merge predictably.
3. Follow the [Component Variant Rule](rules/component-variant-rule.md) so supported internal appearances are a typed component API.
4. Follow the [Color Role Naming Rule](rules/color-role-naming-rule.md) so color utilities state whether they supply a general color, a background, readable text, or a complete surface.
5. Follow the [Theme Token Rule](rules/theme-token-rule.md) so shared interface colors and measurements remain semantic and themeable.
6. Follow the [Style Placement Rule](rules/style-placement-rule.md) so reusable styling has one appropriate owner.
7. Follow the [Component State Rule](rules/component-state-rule.md) so interaction, disabled, selected, loading, and error states stay coherent.
