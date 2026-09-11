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

## `cn` — Class Merging

Combines conditional classes with `clsx` and resolves conflicting Tailwind utilities with `tailwind-merge`, so a later class wins over an earlier one that sets the same property. Every rule in the Next Tailwind Guide is written against this shape.

```ts
// src/utils/cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Route Error Handling Helpers

`HttpError` and `withResponse` are the helpers the Route Handler Rule is written against. `HttpError` carries the status a failure should become; `withResponse` catches an `HttpError` thrown anywhere inside its wrapped function (including by `withUserId`/`withUserAccount`), validates the handler's returned data against a schema, and builds the `{ data, message }` envelope itself, so the handler never calls `NextResponse.json` at all.

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
// src/utils/with-response.ts
export function withResponse<TSchema extends z.ZodType, Args extends unknown[]>(
  responseSchema: TSchema,
  handler: (...args: Args) => Promise<{ message: string; data: z.output<TSchema> }>,
): (...args: Args) => Promise<NextResponse<{ data: z.output<TSchema> | null; message: string }>> {
  return async (...args) => {
    try {
      const { message, data } = await handler(...args);
      return NextResponse.json({ data: responseSchema.parse(data), message });
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ data: null, message: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}
```

A route handler wrapped in `withResponse` has no `try`, loop, or `if` of its own — every delegated call is a bare `await`, since a thrown `HttpError` already short-circuits the rest:

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(
  renderApiResponseDataSchema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
    const ordersWithJobIds = await createPublicationsForOrders(userId, orders);
    const { jobIds } = await dispatchRenderJobs(userId, ordersWithJobIds);
    return { message: "GitHub Action workflow dispatched successfully.", data: jobIds };
  }),
);
```

## `withResponse` Pipeline

A request crosses every layer below on its way in, and a failure crosses each one back out until `withResponse` turns it into a response. The layers read outermost to innermost, and a failure starts either in the session helper or in a delegated call.

| Layer                                              | Sits at                     | Adds                                                                             | On an `HttpError`                                                       |
| -------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `withResponse(responseSchema, handler)`            | outermost, in `route.ts`    | Validation of the handler's returned `data` and the `{ data, message }` envelope | Answers with `{ data: null, message: error.message }` at `error.status` |
| `withUserId(handler)` / `withUserAccount(handler)` | one layer in, in `route.ts` | The session's `userId` or account row as the handler's first argument            | Lets it propagate                                                       |
| the handler                                        | innermost, in `route.ts`    | One bare `await` per step, each result threaded into the next call               | Lets it propagate                                                       |
| a delegated module such as `dispatchRenderJobs`    | imported from `src/utils/`  | The work itself, and the mapping of its own failures to this error type          | Throws it, with the status the failure deserves                         |

The first failure point is the session helper `withUserId` awaits, and the last one is whatever the handler's delegated calls reach:

```ts
// src/utils/require-session.ts
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new HttpError("Unauthorized", 401);
  }
  return session.user.id;
}
```

```ts
// src/utils/instagram.ts
export async function dispatchRenderJobs(userId: string, orders: RenderOrderWithJobId[]) {
  if (!webhookSecret) {
    throw new HttpError("Server not configured for GitHub Actions dispatch.", 500);
  }
  // ...dispatch the workflow and return the job ids.
}
```

```jsonc
// HTTP 401 from POST /api/render-instagram-content
{ "data": null, "message": "Unauthorized" }
```

The same throw without the wrapper leaves the pipeline at the route's edge, one layer short of anything that maps it:

| Layer                                              | Sits at                                                       | Adds                                                                                                             | On an `HttpError`                                  |
| -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| no `withResponse`                                  | absent                                                        | Nothing: no response-schema validation, no `{ data, message }` envelope, and no mapping of a failure to a status | Never reaches a response                           |
| `withUserId(handler)` / `withUserAccount(handler)` | outermost, in `route.ts`                                      | The session's `userId` or account row as the handler's first argument                                            | Lets it propagate                                  |
| the handler                                        | innermost, in `route.ts`, and building its own `NextResponse` | The response itself, returned as a `NextResponse` instead of a `{ message, data }` value                         | Lets it propagate — it holds no `catch` of its own |
| a delegated module such as `dispatchRenderJobs`    | imported from `src/utils/`                                    | The work itself, and the mapping of its own failures to this error type                                          | Throws it, with the status the failure deserves    |

Nothing maps the error on the way out, so the status and message it carries never become the response, the client receives no envelope, and the framework captures the unhandled failure through its own error path — the outcome the Route Handler Rule is written against.

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
