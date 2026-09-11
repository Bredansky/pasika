# Tech Stack Reference

Use this reference to look up the packages the framework's documentation depends on and what each one is responsible for, and the hand-authored helpers a repository writes itself to the exact shape the framework's rules assume. Each package table groups packages by how a repository declares them — in `dependencies`, in `devDependencies`, or not at all.

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

## Hand-Authored Helpers

Code a repository writes itself, unlike the packages above which it only installs. The framework's rules are written against each helper's exact shape, so the canonical implementation lives here once instead of being restated per rule.

### `cn` — Class Merging

Combines conditional classes with `clsx` and resolves conflicting Tailwind utilities with `tailwind-merge`, so a later class wins over an earlier one that sets the same property. Every rule in the Next Tailwind Guide is written against this shape.

```ts
// src/utils/cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Result Pipeline Helpers

`ok`, `err`, `andThen`, `HttpError`, and `respond` are the helpers the Route Handler and Result Pipeline Rules are written against. `ok`/`err` wrap a step's outcome as a `{ ok, value }`/`{ ok, error }` value, `andThen` chains a next step only once the previous one's `ok` is true, `HttpError` carries the status a failure should become, and `respond` turns the pipeline's final Result into a `NextResponse` — the one place a route's `{ data, status, message }` envelope gets built, with `status` always the HTTP status code.

```ts
// src/types/result.ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

```ts
// src/utils/result.ts
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export async function andThen<T, U, E>(
  result: Result<T, E>,
  next: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  return result.ok ? next(result.value) : result;
}
```

```ts
// src/utils/http-error.ts
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
```

```ts
// src/utils/respond.ts
export function respond<T, TData>(
  result: Result<T, HttpError>,
  onSuccess: (value: T) => { message: string; data: TData; status?: number },
): NextResponse<{ data: TData | null; status: number; message: string }> {
  if (!result.ok) {
    const { status, message } = result.error;
    return NextResponse.json({ data: null, status, message }, { status });
  }

  const { message, data, status = 200 } = onSuccess(result.value);
  return NextResponse.json({ data, status, message }, { status });
}
```

A route handler chains them without a `try`, loop, or `if` of its own:

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  const parsed = await parseRenderPayload(request, instagramRenderOrderSchema);
  const published = await andThen(parsed, (orders) => createPublicationsForOrders(userId, orders));
  const result = await andThen(published, (orders) => dispatchRenderJobs(userId, orders));
  return respond(result, ({ jobIds }) => ({ message: "Dispatched.", data: jobIds }));
});
```

## DevDependencies

Toolchain packages declared in `devDependencies` — the baseline both `pasikaApp` and `pasikaNextjsApp` build on. `typescript`, `eslint`, `prettier`, `husky`, `lint-staged`, `zirka`, `vulyk`, `vitest`, and `@vitest/coverage-v8` apply to every repository; `tailwindcss`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, and `@testing-library/dom` apply to a Next.js application only.

| Package                  | Applies to           | Responsibility                                                                                                                                                               |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`             | Every repository     | Typed source and the strict compiler settings the shared base config sets; a `pasikaNextjsApp` repository keeps it on the TypeScript major the bundled pasika parser runs on |
| `tailwindcss`            | Next.js applications | Utility classes, theme variables, and the `@utility` and `@apply` directives the styling Rules use                                                                           |
| `eslint`                 | Every repository     | Runs the shared and framework rulesets                                                                                                                                       |
| `prettier`               | Every repository     | Formats source, applied through the shared ESLint configuration                                                                                                              |
| `husky`                  | Every repository     | Installs the git hooks that run checks before a commit lands                                                                                                                 |
| `lint-staged`            | Every repository     | Runs the lint and format commands against staged files                                                                                                                       |
| `zirka`                  | Every repository     | Combines third-party ESLint plugins, the Prettier configuration, the shared TypeScript base config, and the pasika ruleset                                                   |
| `vulyk`                  | Every repository     | Types the tracked-doc configuration and runs its pinned sync and agent-file generation workflows                                                                             |
| `vitest`                 | Every repository     | Unit-test runner and coverage threshold gate, framework-agnostic so it also runs in a plain TypeScript repository                                                            |
| `@vitest/coverage-v8`    | Every repository     | V8-based coverage provider the coverage thresholds measure against                                                                                                           |
| `jsdom`                  | Next.js applications | DOM environment Vitest renders components into                                                                                                                               |
| `@vitejs/plugin-react`   | Next.js applications | Vitest plugin that compiles JSX/TSX for component tests                                                                                                                      |
| `@testing-library/react` | Next.js applications | Renders components and queries the DOM in component tests                                                                                                                    |
| `@testing-library/dom`   | Next.js applications | DOM query utilities `@testing-library/react` builds on                                                                                                                       |

## npm Scripts

Scripts the Lint Setup, Husky Hook, and Vitest Coverage Rules require in package.json. "Applies to" marks scripts every repository must declare versus ones required only once a repository tracks `eslint-suppressions.json`.

| Script               | Applies to                                       | Runs                                                                            |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `prepare`            | Every repository                                 | `husky`, installing the git hooks                                               |
| `lint`               | Every repository                                 | ESLint across the whole repository                                              |
| `lint:staged`        | Every repository                                 | ESLint with no repository-wide argument, run by `lint-staged` on staged files   |
| `format`             | Every repository                                 | `prettier --check` across the whole repository                                  |
| `format:staged`      | Every repository                                 | Prettier with no repository-wide argument, run by `lint-staged` on staged files |
| `typecheck`          | Every repository                                 | The TypeScript compiler with no emit                                            |
| `lint:prune`         | Repositories tracking `eslint-suppressions.json` | `eslint --prune-suppressions`, keeping the suppression file canonical           |
| `test:unit`          | Every repository                                 | Vitest without coverage                                                         |
| `test:unit:coverage` | Every repository                                 | Vitest with coverage, gated by the ratcheted whole-repository threshold         |
| `test:unit:staged`   | Every repository                                 | `vitest related` without coverage, run by `lint-staged` on staged files         |

## Husky Configuration

`.husky/pre-commit` must run the local checks and capture suppression and coverage ratchets in the commit.

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npm run lint:prune
git add eslint-suppressions.json
npm run test:unit:coverage
git add vitest.config.ts
npx libyear --limit-major-individual=1
```

## lint-staged Wiring

Every named `*:staged` script is wired into `lint-staged` against the glob it applies to, never through the repository-wide script of the same check (see the Lint Setup Rule for why that distinction matters). A JavaScript or TypeScript file matches two of these at once, so its entry chains both commands.

| Glob                                                  | Runs                          | Required by          |
| ----------------------------------------------------- | ----------------------------- | -------------------- |
| `*.{js,jsx,ts,tsx}`                                   | `npm run lint:staged --`      | Lint Setup Rule      |
| `*.{js,jsx,ts,tsx}`                                   | `npm run test:unit:staged --` | Vitest Coverage Rule |
| Files ESLint does not format (e.g. `*.{css,md,json}`) | `npm run format:staged --`    | Lint Setup Rule      |

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["npm run lint:staged --", "npm run test:unit:staged --"],
    "*.{css,md,json}": "npm run format:staged --"
  }
}
```

## CI (Recommended, Not Enforced)

No pasika rule checks a CI workflow file today — everything above is verified locally, at commit time. The following is a recommended pattern, not a requirement:

```yaml
- run: npm run lint
- run: npm run lint:prune
- run: git diff --exit-code -- eslint-suppressions.json
- run: npm run format
- run: npm run typecheck
- run: npm run test:unit:coverage
- run: git diff --exit-code -- vitest.config.ts
- run: npx libyear --limit-major-individual=1
- run: npm run build
```

## Not Declared

Packages that never go into package.json. `pasika`'s rules reach a repository through `zirka`, and `agent-browser` is invoked by agents during a task.

| Package         | Responsibility                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pasika`        | Owns this documentation and the pasika ESLint rulesets — the `pasikaApp` and `pasikaNextjsApp` presets `zirka` composes. The `pasikaNextjsApp` preset parses `src/**` with its own parser, which runs on the TypeScript pasika pins; consuming it fails at config load when the repository's hoisted TypeScript is on a different major, with an error naming the version to align on |
| `agent-browser` | Drives a real browser so an agent can verify browser behavior                                                                                                                                                                                                                                                                                                                         |
