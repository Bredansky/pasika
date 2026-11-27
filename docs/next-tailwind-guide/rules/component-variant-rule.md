# Component Variant Rule

Visual treatments scattered across prop unions, lookup tables, and conditional classes obscure the ownership of a component's appearance choices.

- Components MUST define alternative visual treatments using CVA.
- A component's CVA variant props MUST be typed from its `cva` definition with `VariantProps` rather than manually duplicated unions.
- A statically unused CVA choice MUST NOT remain in an application component.
- A boolean prop that changes appearance MUST use conditional `cn()` when it only adds or removes one standalone class treatment.
- A boolean prop that changes appearance MUST use a CVA variant when both boolean values have explicit treatments or when the boolean participates in a compound variant.

## Incorrect — CVA Variant Union Duplicated by Hand

```tsx
enum ButtonSize {
  Small = "sm",
  Large = "lg",
}

const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      [ButtonSize.Small]: "h-8 px-3",
      [ButtonSize.Large]: "h-11 px-5",
    },
  },
});

type ButtonProps = React.ComponentProps<"button"> & {
  size?: ButtonSize.Small | ButtonSize.Large;
};
```

Why: the accepted `size` values now live in both CVA and a handwritten prop union, so either side can change without the other.

## Correct — Props Derived from CVA

```tsx
enum ButtonSize {
  Small = "sm",
  Large = "lg",
}

const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      [ButtonSize.Small]: "h-8 px-3",
      [ButtonSize.Large]: "h-11 px-5",
    },
  },
  defaultVariants: {
    size: ButtonSize.Small,
  },
});

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ size, className, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ size }), className)} {...props} />;
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
<button className={cn(buttonVariants({ size }), elevated && "shadow-md", className)} />
```

Why: the named appearance choices stay in CVA while the independent boolean variant remains a direct conditional class.

## Incorrect — Compound Boolean Variant Styling Split Across Conditions

```tsx
enum ButtonSize {
  Small = "sm",
  Large = "lg",
}

<button
  className={cn(
    buttonVariants({ size }),
    square ? "justify-center" : "justify-start",
    square && size === ButtonSize.Small && "w-8 px-0",
    square && size === ButtonSize.Large && "w-11 px-0",
  )}
/>;
```

Why: the boolean variant changes treatment according to another variant, but the styling matrix is spread across conditional expressions outside CVA.

## Correct — Boolean Variant with Compound Styling Uses CVA

```tsx
enum ButtonSize {
  Small = "sm",
  Large = "lg",
}

const buttonVariants = cva("inline-flex", {
  variants: {
    size: {
      [ButtonSize.Small]: "h-8 px-3",
      [ButtonSize.Large]: "h-11 px-5",
    },
    square: {
      true: "justify-center",
      false: "justify-start",
    },
  },
  compoundVariants: [
    {
      size: ButtonSize.Small,
      square: true,
      className: "w-8 px-0",
    },
    {
      size: ButtonSize.Large,
      square: true,
      className: "w-11 px-0",
    },
  ],
});
```

Why: both boolean values have explicit treatment and the square appearance changes by size, so CVA owns the complete styling matrix.

## Incorrect — Handwritten Status Styling Map

```tsx
enum Status {
  Draft = "draft",
  Ready = "ready",
}

const statusClasses = {
  [Status.Draft]: "border-divider",
  [Status.Ready]: "border-primary",
};

<div className={statusClasses[status]} />;
```

Why: the lookup table defines alternative visual treatments outside CVA.

## Correct — CVA Status Variants

```tsx
const statusVariants = cva(null, {
  variants: {
    status: {
      [Status.Draft]: "border-divider",
      [Status.Ready]: "border-primary",
    },
  },
});

<div className={statusVariants({ status })} />;
```

Why: the CVA definition owns the visual choices and their classes.
