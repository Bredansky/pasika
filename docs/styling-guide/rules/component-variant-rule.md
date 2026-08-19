# Component Variant Rule

`cva` is Class Variance Authority, a helper for defining a component's visual options and deriving their TypeScript API. `cn` handles a standalone boolean choice without creating a variant matrix.

- A component that lets callers choose visual options MUST define them with `cva`.
- A component's variant prop types MUST be derived from its `cva` definition with `VariantProps` rather than manually duplicated unions.
- A boolean prop that changes appearance MUST use conditional `cn()` when it only adds or removes one standalone class treatment.
- A boolean prop that changes appearance MUST use a CVA variant when both boolean values have explicit treatments or when the boolean participates in a compound variant.

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

export function Button({ size, tone, className, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ size, tone }), className)} {...props} />;
}
```

Why: the CVA definition owns the accepted values, defaults, and classes, while `VariantProps` derives the public TypeScript API from the same source.

## Incorrect — Standalone Boolean Variant Added to CVA

```tsx
const buttonVariants = cva("inline-flex", {
  variants: {
    elevated: {
      true: "shadow-md",
      false: "",
    },
  },
});
```

Why: one boolean variant merely adds a standalone treatment and has no compound relationship, so CVA adds configuration without a styling matrix.

## Correct — Standalone Boolean Variant Uses `cn`

```tsx
<button className={cn(buttonVariants({ size, tone }), elevated && "shadow-md", className)} />
```

Why: the named appearance choices stay in CVA while the independent boolean variant remains a direct conditional class.

## Incorrect — Compound Boolean Variant Styling Split Across Conditions

```tsx
<button
  className={cn(
    buttonVariants({ size }),
    square && "justify-center",
    square && size === "sm" && "w-8 px-0",
    square && size === "lg" && "w-11 px-0",
  )}
/>
```

Why: the boolean variant changes treatment according to another variant, but the styling matrix is spread across conditional expressions outside CVA.

## Correct — Boolean Variant with Compound Styling Uses CVA

```tsx
const buttonVariants = cva("inline-flex", {
  variants: {
    size: {
      sm: "h-8 px-3",
      lg: "h-11 px-5",
    },
    square: {
      true: "justify-center",
      false: "justify-start",
    },
  },
  compoundVariants: [
    {
      size: "sm",
      square: true,
      className: "w-8 px-0",
    },
    {
      size: "lg",
      square: true,
      className: "w-11 px-0",
    },
  ],
});
```

Why: both boolean values have explicit treatment and the square appearance changes by size, so CVA owns the complete styling matrix.
