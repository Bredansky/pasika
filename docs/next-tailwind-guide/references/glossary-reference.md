# Glossary Reference

Use this reference to look up the styling terms this guide's rules use.

## Theme Terms

These terms name the styling this project owns and where it is defined.

| Term                     | Definition                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project styling          | Styling that expresses the project's own design decisions, as opposed to values that arrive from content or data at runtime.                                                      |
| Global stylesheet        | The single CSS entry point that registers Tailwind and defines the project's theme, custom utilities, base styles, and keyframes.                                                 |
| Theme variable namespace | One of [Tailwind's theme-variable groups](https://tailwindcss.com/docs/theme#theme-variable-namespaces), such as `--color-*` or `--radius-*`, whose variables generate utilities. |
| Token                    | A single project styling value registered in a theme variable namespace, such as `--radius-md`, whose utility Tailwind generates.                                                 |
| Custom utility           | A utility the project defines with Tailwind's `@utility` directive.                                                                                                               |

## Role Terms

These terms name what a styling value is used for and the `<role>-*` name that carries it.

| Term   | Definition                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas | A value used only as a background, exposed as `--<role>-canvas` and applied through `bg-<role>-canvas`.                                                     |
| Ink    | A value used only as readable text, exposed as `--<role>-ink` and applied through `text-<role>-ink`.                                                        |
| Edge   | A value used only as a visual boundary such as a border, outline, ring, or stroke, exposed as `--<role>-edge` and applied through `<property>-<role>-edge`. |
| Skin   | A custom utility that owns a repeated combination of two or more styles that should change together, named `<role>-skin`.                                   |

## State Terms

These terms name the conditions that change a component's appearance.

| Term          | Definition                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| UI state      | A condition a component can be in that changes its appearance: interaction, disabled, selected, loading, or error. |
| State variant | A Tailwind variant prefix that targets a state, such as `hover:`, `focus-visible:`, `disabled:`, or `aria-busy:`.  |

## Helper Terms

These terms name the helpers this guide's rules are written against.

| Term  | Definition                                                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cn`  | The helper every rule in this guide is written against; its canonical implementation lives in the Tech Stack Reference. It combines conditional classes with `clsx` and resolves conflicting Tailwind utilities with `tailwind-merge`, so a later class wins over an earlier one that sets the same property. |
| `cva` | Class Variance Authority, which defines a component's visual options as its variants, and derives their TypeScript API through `VariantProps`.                                                                                                                                                                |
