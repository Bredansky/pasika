# Tech Stack Reference

Use this reference to look up the packages the framework's documentation depends on and what each one is responsible for. Packages are grouped by who owns them.

## Application Packages

These packages provide the runtime and authoring surfaces the framework's Rules describe. A repository that adopts the framework installs all of them.

| Package                    | Responsibility                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `next`                     | App Router framework whose routing-file conventions define the `app` layer                      |
| `react`                    | Component runtime the component Rules are written against                                       |
| `react-dom`                | Browser renderer for React components                                                           |
| `typescript`               | Typed source and the strict compiler settings the shared base config sets                       |
| `tailwindcss`              | Utility classes, theme variables, and the `@utility` and `@apply` directives the styling Rules use |
| `zod`                      | Runtime validation schemas the data-contract conventions require                                |
| `class-variance-authority` | Provides `cva` and `VariantProps` for typed component variants                                  |
| `clsx`                     | Conditional class-name building block of `cn`                                                   |
| `tailwind-merge`           | Conflicting-utility resolution building block of `cn`                                           |
| `eslint`                   | Runs the shared and framework rulesets                                                          |
| `prettier`                 | Formats source, applied through the shared ESLint configuration                                 |
| `husky`                    | Installs the git hooks that run checks before a commit lands                                    |
| `lint-staged`              | Runs the lint and format commands against staged files                                          |

## Framework Packages

These packages are the framework itself. `pasika` and `zirka` are installed as development dependencies, while `vulyk` runs from the registry without being installed.

| Package  | Responsibility                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------- |
| `pasika` | Owns this documentation, the `pasika` ESLint ruleset derived from it, and the CLI that applies and diagnoses both |
| `zirka`  | Combines third-party ESLint plugins, the Prettier configuration, and the shared TypeScript base config     |
| `vulyk`  | Installs tracked docs from pinned sources and generates the agent files that route to them                 |

## Agent Tooling

These tools are invoked by agents during a task rather than installed into a project.

| Tool            | Responsibility                                                    |
| --------------- | ----------------------------------------------------------------- |
| `agent-browser` | Drives a real browser so an agent can verify browser behavior      |
