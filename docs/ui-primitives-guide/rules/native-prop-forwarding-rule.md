# Native Prop Forwarding Rule

Reusable primitives should behave like the native element they represent, while adding only the component-specific API needed for composition. This rule avoids recreating native attributes in incomplete custom prop types.

- A primitive rooted in a native element MUST extend that element's native component props.
- A primitive MUST forward unconsumed native props to its rendered root element.
- A primitive SHOULD merge one root `className` through the project's class-composition helper.
- A primitive MAY add typed component-specific props in addition to its native props.

## Incorrect

```tsx
type ButtonProps = {
  label: string;
  onClick(): void;
};

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

Why: consumers lose native button attributes such as `disabled`, `type`, and accessible labeling because the wrapper invents a smaller interface.

## Correct

```tsx
type ButtonProps = React.ComponentProps<"button"> & {
  loading?: boolean;
};

function Button({ className, loading, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center", className)}
      disabled={disabled || loading}
      {...props}
    />
  );
}
```

Why: the primitive preserves the native button contract while adding a focused component-specific state.
