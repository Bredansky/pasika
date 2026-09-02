# Tech Stack Reference

Use this reference to look up the packages the framework's documentation depends on and what each one is responsible for. Each table groups packages by how a repository declares them — in `dependencies`, in `devDependencies`, or not at all.

## Dependencies

Runtime packages a Next.js application ships in `dependencies` — what `pasikaNextjsApp` adds beyond the `pasikaApp` baseline. A plain TypeScript repository lists none of them, so `pasikaApp` presumes no `dependencies` at all.

| Package                    | Responsibility                                                             |
| -------------------------- | -------------------------------------------------------------------------- |
| `next`                     | App Router framework whose routing-file conventions define the `app` layer |
| `react`                    | Component runtime the component Rules are written against                  |
| `react-dom`                | Browser renderer for React components                                      |
| `zod`                      | Runtime validation schemas the data-contract conventions require           |
| `class-variance-authority` | Provides `cva` and `VariantProps` for typed component variants             |
| `clsx`                     | Conditional class-name building block of `cn`                              |
| `tailwind-merge`           | Conflicting-utility resolution building block of `cn`                      |

## DevDependencies

Toolchain packages declared in `devDependencies` — the baseline both `pasikaApp` and `pasikaNextjsApp` build on. `typescript`, `eslint`, `prettier`, `husky`, `lint-staged`, and `zirka` apply to every repository; `tailwindcss` applies to a Next.js application only.

| Package       | Applies to           | Responsibility                                                                                                                                                               |
| ------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`  | Every repository     | Typed source and the strict compiler settings the shared base config sets; a `pasikaNextjsApp` repository keeps it on the TypeScript major the bundled pasika parser runs on |
| `tailwindcss` | Next.js applications | Utility classes, theme variables, and the `@utility` and `@apply` directives the styling Rules use                                                                           |
| `eslint`      | Every repository     | Runs the shared and framework rulesets                                                                                                                                       |
| `prettier`    | Every repository     | Formats source, applied through the shared ESLint configuration                                                                                                              |
| `husky`       | Every repository     | Installs the git hooks that run checks before a commit lands                                                                                                                 |
| `lint-staged` | Every repository     | Runs the lint and format commands against staged files                                                                                                                       |
| `zirka`       | Every repository     | Combines third-party ESLint plugins, the Prettier configuration, the shared TypeScript base config, and the pasika ruleset                                                   |

## Not Declared

Packages that never go into package.json. `pasika`'s rules reach a repository through `zirka`, `vulyk` runs ephemerally with `npx vulyk@latest`, and `agent-browser` is invoked by agents during a task.

| Package         | Responsibility                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pasika`        | Owns this documentation and the pasika ESLint rulesets — the `pasikaApp` and `pasikaNextjsApp` presets `zirka` composes. The `pasikaNextjsApp` preset parses `src/**` with its own parser, which runs on the TypeScript pasika pins; consuming it fails at config load when the repository's hoisted TypeScript is on a different major, with an error naming the version to align on |
| `vulyk`         | Installs tracked docs from pinned sources and generates the agent files that route to them                                                                                                                                                                                                                                                                                            |
| `agent-browser` | Drives a real browser so an agent can verify browser behavior                                                                                                                                                                                                                                                                                                                         |
