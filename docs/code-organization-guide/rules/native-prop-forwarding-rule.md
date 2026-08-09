# Native Prop Forwarding Rule

Components that wrap a native element should preserve that element's behavior and attributes instead of recreating a smaller custom interface. This rule keeps native capabilities available to consumers.

- A component rooted in a native element MUST extend that element's native component props.
- A component MUST forward unconsumed native props to its rendered root element.
- A component SHOULD merge one root `className` through the project's class-composition helper.
- A component MAY add typed component-specific props in addition to its native props.

## Incorrect

```tsx
type ButtonProps = {
  label: string;
  onClick(): void;
};

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

Why: consumers lose native button attributes such as `disabled`, `type`, and accessible labeling because the wrapper invents a smaller interface.

## Correct

```tsx
type ButtonProps = React.ComponentProps<"button"> & {
  loading?: boolean;
};

export function Button({ className, loading, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center", className)}
      disabled={disabled || loading}
      {...props}
    />
  );
}
```

Why: the component preserves the native button contract while adding a focused component-specific state.
