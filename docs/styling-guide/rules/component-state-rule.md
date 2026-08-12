# Component State Rule

Visual state communicates whether a component can be used and what will happen when it is used. This rule keeps that feedback owned by the component rather than reconstructed by every caller.

- A component MUST provide a visually distinguishable treatment for every state it supports, including hover, focus, active, disabled, selected, loading, and error states when applicable.
- Components MUST keep state styling with the component or its variant definition when the state is intrinsic to its behavior.
- Components SHOULD use native semantic elements and attributes so browser, keyboard, and assistive-technology behavior matches the visual state.
- Components MAY accept state props when the state is controlled by their parent.

## Incorrect — State Styled Only with Classes

```tsx
<Button className={isSaving ? "pointer-events-none opacity-50" : ""}>Save</Button>
```

Why: every caller has to reconstruct the saving or disabled treatment, and the button does not receive a semantic disabled state.

## Correct — State Exposed Through Component Props

```tsx
<Button disabled={isSaving} loading={isSaving}>
  Save
</Button>
```

Why: the component owns its loading and disabled treatment through a stable API, and the same ownership applies to every other state it supports.
