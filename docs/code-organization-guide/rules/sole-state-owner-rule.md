# Sole State Owner Rule

Some blocks of elements are the only consumers of a state hook. This rule extracts those blocks into components that own the hook.

- A block of elements that is the only consumer of a state hook MUST be extracted to a named component that owns the hook.

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

Why: the help button and modal are the only users of `isHelpOpen`, but the state lives in `DashboardView`.

## Correct — Child Owns Its State

```text
src/compositions/
  dashboard-view/
    index.ts                  # re-exports only dashboard-view.tsx
    dashboard-view.tsx
    help-dialog.tsx           # exclusive child — imported directly
```

```tsx
// src/compositions/dashboard-view/help-dialog.tsx
export function HelpDialog(): React.JSX.Element {
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
import { HelpDialog } from "./help-dialog";

export function DashboardView(): React.JSX.Element {
  return (
    <div>
      <h1>Dashboard</h1>
      <HelpDialog />
      <DashboardContent />
    </div>
  );
}
```

Why: `HelpDialog` owns the help button, modal, and `isHelpOpen` state. `DashboardView` only composes it.
