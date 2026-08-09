# Slot Contract Rule

Reusable components need stable styling hooks for relationships that their public API supports. This rule uses semantic slot names instead of selectors coupled to a particular DOM depth or class implementation.

- Every reusable component root MUST expose a stable `data-slot` value.
- Slot names SHOULD be kebab-case and describe the component's role.
- Components MAY use data-slot selectors for a parent-to-child styling relationship owned by the component.

## Incorrect

```tsx
<div className="card-root">
  <div className="header">...</div>
</div>

<div className="[&_.header]:grid-cols-[1fr_auto]">...</div>
```

Why: the selector depends on an implementation class and silently breaks when the component's markup changes.

## Correct

```tsx
<div data-slot="card" className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
  <div data-slot="card-header">...</div>
  <div data-slot="card-action">...</div>
</div>
```

Why: the relationship is expressed through stable semantic hooks that remain meaningful when internal classes evolve.
