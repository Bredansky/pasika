# Glossary Reference

Use this reference to look up the terms the framework's Guides, Rules, and Conventions use. Terms are grouped by the subject they belong to.

## Structure Terms

These terms name the parts of the `src/` tree and the way an item's location is derived from its consumers.

| Term                       | Definition                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer                      | One of the five scopes an item can belong to: `app`, `compositions`, `features`, `shared`, or `root`.                                          |
| Feature                    | One folder under `src/features/` holding the components and support files of a single product capability.                                      |
| Composition                | A component that imports from two or more feature folders.                                                                                    |
| Support file               | A hook, type, schema, constant, or pure function that supports other code rather than rendering UI.                                            |
| Support folder             | A folder named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/` that holds support files of that kind.                                |
| Closest common folder (CCF) | The closest folder under `src/` shared by every file that uses an item.                                                                       |
| Configuration module       | An app-wide module under `src/config/<config-name>/` that selects or parameterizes application behavior.                                       |
| Barrel                     | An `index.ts` whose only content is re-exports of other modules.                                                                              |

## Component Terms

These terms name the component classifications and the extraction triggers the code-organization workflow uses.

| Term                     | Definition                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart component          | A component that fetches data, or that defines `handle*` callbacks and passes them to children as `on*` props.                                           |
| Dumb component           | A component that neither fetches data nor defines `handle*` callbacks for children.                                                                     |
| Exclusive child component | A component imported only by its parent component.                                                                                                    |
| Nested component         | A component that lives in a folder carrying its own name, together with its exclusive children and their support files.                                  |
| Interactive element      | An HTML element the HTML specification lists as [interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content).               |
| Imperative category      | One of four kinds of imperative work a hook can contain — subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle — where each operation counts toward exactly one of them. |
| Subscriptions            | Event listeners and registration or cleanup APIs such as `on()` and `off()`.                                                                            |
| External I/O and persistence | Network requests, asynchronous reads or writes, and browser storage.                                                                                 |
| DOM manipulation         | Imperative DOM APIs such as `focus()`, `classList`, observers, or imperative rendering.                                                                 |
| Resource lifecycle       | Setup and teardown APIs such as `load()`, `destroy()`, or `dispose()`.                                                                                  |

## Styling Terms

These terms name the styling roles, helpers, and states the styling workflow refers to.

| Term                    | Definition                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Project styling         | Styling that expresses the project's own design decisions, as opposed to values that arrive from content or data at runtime.                    |
| Global stylesheet       | The single CSS entry point that registers Tailwind and defines the project's theme, custom utilities, base styles, and keyframes.               |
| Theme variable namespace | One of [Tailwind's theme-variable groups](https://tailwindcss.com/docs/theme#theme-variable-namespaces), such as `--color-*` or `--radius-*`, whose variables generate utilities. |
| Custom utility          | A utility the project defines with Tailwind's `@utility` directive.                                                                             |
| Canvas                  | A value used only as a background, exposed as `--<role>-canvas` and applied through `bg-<role>-canvas`.                                         |
| Ink                     | A value used only as readable text, exposed as `--<role>-ink` and applied through `text-<role>-ink`.                                            |
| Surface                 | A custom utility that owns a repeated combination of canvas, ink, and related styles, named `<role>-surface`.                                   |
| UI state                | A condition a component can be in that changes its appearance: interaction, disabled, selected, loading, or error.                              |
| State variant           | A Tailwind variant prefix that targets a state, such as `hover:`, `focus-visible:`, `disabled:`, or `aria-busy:`.                               |
| `cn`                    | The project's class-merging helper, which combines conditional classes and resolves conflicting Tailwind utilities.                             |
| `cva`                   | Class Variance Authority, which defines a component's visual options and derives their TypeScript API through `VariantProps`.                   |

## Managed Documentation Terms

These terms name the parts of the framework's documentation distribution that appear inside a consuming repository.

| Term              | Definition                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tracked doc       | A document a repository consumes from a pinned remote source rather than authoring itself.                                      |
| Managed file      | A file Vulyk installed or generated, listed in the `.vulyk` manifest of the folder that holds it.                               |
| Agent file        | A generated `AGENTS.md` or `CLAUDE.md` that routes an agent to the tracked docs applying to its folder.                         |
| Inline entry      | A tracked doc whose full body is written into the generated agent file instead of being summarized with a link.                 |
