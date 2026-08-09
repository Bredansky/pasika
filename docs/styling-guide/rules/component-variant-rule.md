# Component Variant Rule

Supported visual differences are part of a component's API, not a set of internal class names for callers to assemble. This rule keeps variation typed and encapsulated.

- Reusable components MUST express supported internal visual variations through typed variants such as `cva`.
- Components MUST NOT expose separate class-name props for internal elements merely to vary their appearance.
- Components SHOULD expose one root `className` for parent-controlled placement and sizing when that flexibility is useful.
- Components MAY add a named slot API when consumers genuinely need to provide structured content rather than alter internal styling.

## Incorrect

```tsx
<Button iconClassName="text-lg" labelClassName="font-bold" />
```

Why: callers must know the button's internal elements to request a supported appearance.

## Correct

```tsx
const buttonVariants = cva("inline-flex items-center justify-center", {
  variants: {
    size: { sm: "h-8 px-3", lg: "h-11 px-5" },
    tone: { primary: "bg-primary text-primary-foreground", ghost: "bg-transparent" },
  },
});

<Button size="lg" tone="primary" className="mt-4" />
```

Why: the component owns its internal treatment while the caller controls only a supported variant and external placement.
