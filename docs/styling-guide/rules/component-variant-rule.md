# Component Variant Rule

When callers choose between a component's visual appearances, the styling definition and TypeScript API need one source of truth. This rule uses CVA for named choices and reserves `cn` for standalone boolean conditions.

- A component that lets callers choose between named visual appearances MUST define those choices with `cva`.
- Component variant prop types MUST be derived with `VariantProps<typeof componentVariants>`.
- Component props MUST NOT manually duplicate a union already defined by the CVA configuration.
- A boolean appearance input MUST use conditional `cn()` when it only adds or removes one standalone class treatment.
- A boolean appearance input MUST use a CVA variant when both boolean values have explicit treatments or when the boolean participates in a compound variant.
- A component MUST NOT expose separate class-name props for internal elements to vary their appearance.
- A component MAY expose structured content slots when callers need to provide content rather than alter internal styling.

## Incorrect — Variant Union Duplicated by Hand

```tsx
const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      sm: "h-8 px-3",
      lg: "h-11 px-5",
    },
  },
});

type ButtonProps = React.ComponentProps<"button"> & {
  size?: "sm" | "lg";
};
```

Why: the accepted `size` values now live in both CVA and a handwritten prop union, so either side can change without the other.

## Correct — Props Derived from CVA

```tsx
const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      sm: "h-8 px-3",
      lg: "h-11 px-5",
    },
    tone: {
      primary: "primary-surface",
      danger: "danger-surface",
    },
  },
  defaultVariants: {
    size: "sm",
    tone: "primary",
  },
});

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export default function Button({ size, tone, className, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ size, tone }), className)} {...props} />;
}
```

Why: the CVA definition owns the accepted values, defaults, and classes, while `VariantProps` derives the public TypeScript API from the same source.

## Incorrect — Standalone Boolean Added to CVA

```tsx
const buttonVariants = cva("inline-flex", {
  variants: {
    loading: {
      true: "cursor-wait opacity-70",
      false: "",
    },
  },
});
```

Why: one boolean merely adds a standalone treatment and has no compound relationship, so CVA adds configuration without a styling matrix.

## Correct — Standalone Boolean Uses `cn`

```tsx
<button className={cn(buttonVariants({ size, tone }), loading && "cursor-wait opacity-70", className)} />
```

Why: the named appearance choices stay in CVA while the independent boolean remains a direct conditional class.

## Incorrect — Compound Boolean Styling Split Across Conditions

```tsx
<button
  className={cn(
    buttonVariants({ tone }),
    loading && "cursor-wait",
    loading && tone === "primary" && "primary-loading-surface",
    loading && tone === "danger" && "danger-loading-surface",
  )}
/>
```

Why: the boolean changes treatment according to another variant, but the styling matrix is spread across conditional expressions outside CVA.

## Correct — Boolean with Compound Styling Uses CVA

```tsx
const buttonVariants = cva("inline-flex", {
  variants: {
    tone: {
      primary: "primary-surface",
      danger: "danger-surface",
    },
    loading: {
      true: "cursor-wait",
      false: "cursor-default",
    },
  },
  compoundVariants: [
    {
      tone: "primary",
      loading: true,
      className: "primary-loading-surface",
    },
    {
      tone: "danger",
      loading: true,
      className: "danger-loading-surface",
    },
  ],
});
```

Why: both boolean values have explicit treatment and loading changes by tone, so CVA owns the complete styling matrix.
