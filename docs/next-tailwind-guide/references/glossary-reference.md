# Glossary Reference

Use this reference to look up the styling terms this guide's rules use, and the class-merging helper they are written against.

## Terms

These terms name the styling roles, helpers, and states the styling workflow refers to.

| Term                     | Definition                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project styling          | Styling that expresses the project's own design decisions, as opposed to values that arrive from content or data at runtime.                                                      |
| Global stylesheet        | The single CSS entry point that registers Tailwind and defines the project's theme, custom utilities, base styles, and keyframes.                                                 |
| Theme variable namespace | One of [Tailwind's theme-variable groups](https://tailwindcss.com/docs/theme#theme-variable-namespaces), such as `--color-*` or `--radius-*`, whose variables generate utilities. |
| Custom utility           | A utility the project defines with Tailwind's `@utility` directive.                                                                                                               |
| Canvas                   | A value used only as a background, exposed as `--<role>-canvas` and applied through `bg-<role>-canvas`.                                                                           |
| Ink                      | A value used only as readable text, exposed as `--<role>-ink` and applied through `text-<role>-ink`.                                                                              |
| Edge                     | A value used only as a visual boundary such as a border, outline, ring, or stroke, exposed as `--<role>-edge` and applied through `<property>-<role>-edge`.                       |
| Surface                  | A custom utility that owns a repeated combination containing at least two of the canvas, ink, and edge roles plus any related styles, named `<role>-surface`.                     |
| UI state                 | A condition a component can be in that changes its appearance: interaction, disabled, selected, loading, or error.                                                                |
| State variant            | A Tailwind variant prefix that targets a state, such as `hover:`, `focus-visible:`, `disabled:`, or `aria-busy:`.                                                                 |
| `cva`                    | Class Variance Authority, which defines a component's visual options and derives their TypeScript API through `VariantProps`.                                                     |

## Class Merging Helper

`cn` is the helper every rule in this guide is written against. It combines conditional classes with `clsx` and resolves conflicting Tailwind utilities with `tailwind-merge`, so a later class wins over an earlier one that sets the same property.

```ts
// src/utils/cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Conditional classes and a consumer's `className` both pass through it, and the last conflicting utility is the one that applies:

```tsx
// `p-6` wins over `p-4`, and the disabled treatment applies only when disabled
<article className={cn("card-surface rounded-lg p-4", isDisabled && "opacity-50", className)} />;

<Card className="p-6" />;
```
