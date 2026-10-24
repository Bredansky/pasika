# Sole State Owner Rule

Some blocks of elements are the only consumers of a state hook. This rule extracts those blocks into components that own the hook.

- A component MUST extract a named component when one part of its JSX contains every JSX expression, callback, and effect that reads one state hook's value or calls its updater.

## Incorrect — Parent Keeps Child-Only State

```tsx
// src/compositions/dashboard-view.tsx
import { locales } from "@/locales";

export function DashboardView(): React.JSX.Element {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div>
      <h1>{locales.dashboard}</h1>
      <button onClick={() => setIsHelpOpen(true)} type="button">
        {locales.help}
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
    help-dialog/
      index.ts                # re-exports only help-dialog.tsx
      help-dialog.tsx
      help-trigger.tsx        # exclusive child — imported directly
```

```tsx
// src/compositions/dashboard-view/help-dialog/help-dialog.tsx
import { HelpTrigger } from "./help-trigger";

export function HelpDialog(): React.JSX.Element {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <HelpTrigger onOpen={() => setIsHelpOpen(true)} />
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
// src/compositions/dashboard-view/help-dialog/help-trigger.tsx
import { locales } from "@/locales";

type HelpTriggerProps = {
  onOpen: () => void;
};

export function HelpTrigger({ onOpen }: HelpTriggerProps): React.JSX.Element {
  return (
    <button onClick={onOpen} type="button">
      {locales.help}
    </button>
  );
}
```

```tsx
// src/compositions/dashboard-view/dashboard-view.tsx
import { HelpDialog } from "./help-dialog";
import { locales } from "@/locales";

export function DashboardView(): React.JSX.Element {
  return (
    <div>
      <h1>{locales.dashboard}</h1>
      <HelpDialog />
      <DashboardContent />
    </div>
  );
}
```

Why: `HelpDialog` owns the help button, modal, and `isHelpOpen` state. `DashboardView` only composes it.
