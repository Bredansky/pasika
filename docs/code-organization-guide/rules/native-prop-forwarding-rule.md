# Native Prop Forwarding Rule

When a component renders a native element, a smaller custom prop interface can hide capabilities that consumers need. This rule preserves native props while allowing focused component-specific props.

- A component that renders a native root element MUST include that element's native props in its props type.
- A component MUST forward unconsumed native props to its rendered root element.
- A component MAY add component-specific props alongside its native props.

## Incorrect — Native Props Replaced

```tsx
type ButtonProps = {
  label: string;
  onClick(): void;
};

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

Why: the custom interface leaves out native button props such as `disabled`, `type`, and accessible labels.

## Correct — Native Props Extended and Forwarded

```tsx
type ButtonProps = React.ComponentProps<"button"> & {
  loading?: boolean;
};

export function Button({ className, loading, disabled, ...props }: ButtonProps) {
  return <button className={cn("inline-flex items-center", className)} disabled={disabled || loading} {...props} />;
}
```

Why: the component forwards its unused native props while adding the `loading` state it needs.
