# UI Primitives Guide

This guide defines the public contracts of reusable UI primitives so consumers can compose them without depending on their internal DOM. Use it when adding or changing a shared control, layout primitive, or compound component.

## How To Build a UI Primitive

Use this workflow when a component is intended for reuse beyond one feature.

1. Follow the [Native Prop Forwarding Rule](rules/native-prop-forwarding-rule.md) so a primitive retains the behavior and attributes of its native element.
2. Follow the [Polymorphic Primitive Rule](rules/polymorphic-primitive-rule.md) so a primitive can render through an appropriate consumer-provided element without an extra wrapper.
3. Follow the [Slot Contract Rule](rules/slot-contract-rule.md) so primitives expose stable CSS hooks without leaking their DOM structure.
4. Follow the [Compound Component Rule](rules/compound-component-rule.md) so a primitive with coordinated subparts remains discoverable and cohesive.
