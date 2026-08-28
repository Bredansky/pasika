# Component UI State Rule

Visual state communicates whether a component can be used and what will happen when it is used. This rule keeps that feedback owned by the component rather than reconstructed by every caller.

- A component MUST use Tailwind "state variants" when they can express a supported UI state.
- A component MUST express a UI state through the native element, attribute, or ARIA state for it and MUST NOT use a custom equivalent.

## Incorrect — State Styled Only with Classes

```tsx
<Button className={isSaving ? "pointer-events-none opacity-50" : ""}>Save</Button>
```

Why: every caller has to reconstruct the saving or disabled treatment, and the button does not receive a semantic disabled state.

## Correct — State Exposed Through Component Props

```tsx
import { cn } from "@/utils/cn";

type ButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ children, disabled = false, loading = false }: ButtonProps): React.JSX.Element {
  const isUnavailable = disabled || loading;

  return (
    <button
      aria-busy={loading}
      className={cn(
        "rounded px-3",
        "hover:opacity-90 focus-visible:outline-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-busy:animate-pulse",
      )}
      disabled={isUnavailable}
      type="button"
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

<Button loading={isSaving}>Save</Button>;
```

Why: `Button` uses native disabled and ARIA busy attributes with Tailwind state variants, while callers express only loading through its typed API.
