# Sole State Owner Rule

State owned by a parent but consumed only by a child threads a redundant prop pair through the tree and breaks encapsulation. This rule fixes ownership on the sole-state-owner trigger.

- A block of elements MUST be extracted as a named component and own the state itself when it is the only consumer of that state.

## Incorrect — Parent Keeps Child-Only State

```tsx
// src/compositions/dashboard-view.tsx
export function DashboardView(): React.JSX.Element {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => setIsHelpOpen(true)} type="button">
        Help
      </button>
      {isHelpOpen && (
        <Modal onClose={() => setIsHelpOpen(false)}>
          <HelpContent />
        </Modal>
      )}
      <DashboardContent />
    </div>
  );
}
```

Why: `useState` for `isHelpOpen` lives in `<DashboardView>`, but the only consumer is the inline `<button>` + `<Modal>` block. The block and its state travel together as a unit, so the parent shouldn't carry the state for a block it doesn't own.

## Correct — Child Owns Its State

```text
src/compositions/
  dashboard-view/
    index.ts                  # re-exports only dashboard-view.tsx
    dashboard-view.tsx
    help-button.tsx           # exclusive child — imported directly
```

```tsx
// src/compositions/dashboard-view/help-button.tsx
export function HelpButton(): React.JSX.Element {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsHelpOpen(true)} type="button">
        Help
      </button>
      {isHelpOpen && (
        <Modal onClose={() => setIsHelpOpen(false)}>
          <HelpContent />
        </Modal>
      )}
    </>
  );
}
```

```tsx
// src/compositions/dashboard-view/dashboard-view.tsx
import { HelpButton } from "./help-button";

export function DashboardView(): React.JSX.Element {
  return (
    <div>
      <h1>Dashboard</h1>
      <HelpButton />
      <DashboardContent />
    </div>
  );
}
```

Why: `useState` for `isHelpOpen` now lives inside `<HelpButton>`, the only component that consumes it. The block and its state live as one unit, and `<DashboardView>` no longer carries state for a block it doesn't own. `HelpButton` is exclusive to `DashboardView`, so `DashboardView` becomes a folder whose barrel exposes only the parent.
