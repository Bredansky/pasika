# Component Variant Rule

A component's variants can be spread across handwritten prop unions and conditional classes, leaving no single owner for the visual options the component accepts. This rule decides which appearance choices belong in `cva` and which stay conditional classes.

- A component that lets callers choose visual options MUST define them with `cva`.
- A component's CVA variant props MUST be typed from its `cva` definition with `VariantProps` rather than manually duplicated unions.
- A private, single-purpose local style map MUST NOT merely forward identically named keys into CVA.
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

enum ButtonTone {
  Primary = "primary",
  Danger = "danger",
}

const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      [ButtonSize.Small]: "h-8 px-3",
      [ButtonSize.Large]: "h-11 px-5",
    },
    tone: {
      [ButtonTone.Primary]: "bg-primary-canvas text-primary-ink",
      [ButtonTone.Danger]: "bg-danger-canvas text-danger-ink",
    },
  },
  defaultVariants: {
    size: ButtonSize.Small,
    tone: ButtonTone.Primary,
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
enum ButtonSize {
  Small = "sm",
  Large = "lg",
}

<button
  className={cn(
    buttonVariants({ size }),
    square && "justify-center",
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

## Incorrect — Identity Map Only Forwarded Into CVA

```tsx
enum ButtonTone {
  Primary = "primary",
  Secondary = "secondary",
}

const buttonBackgrounds = {
  [ButtonTone.Primary]: "bg-primary",
  [ButtonTone.Secondary]: "bg-secondary",
};
const { primary, secondary } = buttonBackgrounds;
const buttonVariants = cva("inline-flex", {
  variants: {
    tone: {
      [ButtonTone.Primary]: cn(primary, "border-4"),
      [ButtonTone.Secondary]: cn(secondary, "border-2"),
    },
  },
});
```

Why: this private map and its bindings only forward style strings into CVA, introducing another styling contract without changing the mapping.

## Correct — CVA Owns the Choice Styling

```tsx
enum ButtonTone {
  Primary = "primary",
  Secondary = "secondary",
}

const buttonVariants = cva("inline-flex", {
  variants: {
    tone: {
      [ButtonTone.Primary]: "bg-primary border-4",
      [ButtonTone.Secondary]: "bg-secondary border-2",
    },
  },
});
```

Why: enum members name the closed set of CVA choices while CVA owns their classes; `tone` and `size` are structural dimension keys, and boolean `true`/`false` choices need no enum. Imported, exported, or independently reused style maps are not considered redundant.

## Incorrect — CVA Options With No Production Consumers

```tsx
enum SkeletonSize {
  Small = "sm",
  Medium = "md",
  Large = "lg",
}

const skeletonVariants = cva("animate-pulse", {
  variants: {
    size: {
      [SkeletonSize.Small]: "h-8",
      [SkeletonSize.Medium]: "h-10",
      [SkeletonSize.Large]: "h-14",
    },
  },
});

export function ButtonSkeleton({ size }: VariantProps<typeof skeletonVariants>) {
  return <div className={skeletonVariants({ size })} />;
}

// The only production call site is <ButtonSkeleton size={SkeletonSize.Medium} />.
// SkeletonSize.Small and SkeletonSize.Large are dead choices in this closed application component.
```

Why: offering variants never selected by any production JSX caller adds a maintenance surface. The rule counts literal values, enum members, static local constants, conditional branches, and defaults (both CVA defaults and component parameter defaults); test-only renderings do not establish production usage.

## Correct — Preserve Dynamic or Indirectly Used Choices

```tsx
// The value comes from runtime state, so a particular choice cannot be
// proved unused from static JSX call sites.
<ButtonSkeleton size={selectedSize} />
```

Why: dynamic expressions, spread props, shadowed values, and indirect consumers make usage uncertain, so ESLint must not guess. Published libraries with package exports are excluded because external consumers cannot be inspected.
