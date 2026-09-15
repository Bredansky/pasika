# Tech Stack Reference

Use this reference to look up the packages the framework's documentation depends on and what each one is responsible for, and the helpers the framework ships for a repository to import. Each package table groups packages by how a repository declares them — in `dependencies`, in `devDependencies`, or not at all — and each helper is shown by the entry a repository imports it from and what the caller does with it.

## Dependencies

Runtime packages a Next.js application ships in `dependencies` — what `pasikaNextjsApp` adds beyond the `pasikaApp` baseline. A plain TypeScript repository lists none of them, so `pasikaApp` presumes no `dependencies` at all.

| Package                    | Responsibility                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next`                     | App Router framework whose routing-file conventions define the `app` layer                                                           |
| `pasika`                   | Ships the helpers a repository imports — `cn`, `HttpError`, `withResponse`, and `zodFetch` — and the ESLint presets `zirka` composes |
| `react`                    | Component runtime the component Rules are written against                                                                            |
| `react-dom`                | Browser renderer for React components                                                                                                |
| `zod`                      | Runtime validation schemas the data-contract conventions require                                                                     |
| `class-variance-authority` | Provides `cva` and `VariantProps` for typed component variants                                                                       |
| `clsx`                     | Conditional class-name building block the packaged `cn` resolves against                                                             |
| `tailwind-merge`           | Conflicting-utility resolution building block the packaged `cn` resolves against                                                     |

## `cn` — Class Merging

Combines conditional classes with `clsx` and resolves conflicting Tailwind utilities with `tailwind-merge`, so a later class wins within one utility group and the same variant, and a wider class later in the list replaces the narrower ones it covers. Every rule in the Next Tailwind Guide is written against this behavior, and a repository imports the helper from `pasika/cn`.

```ts
import { cn } from "pasika/cn";

cn("px-2 py-1", isActive && "bg-slate-900", "bg-slate-700"); // "px-2 py-1 bg-slate-700"
```

## Route Error Handling Helpers

`HttpError` and `withResponse` exist so a route can answer the failure it was handed: the error carries the status a failure should become, the message a client should read, and — when an upstream call was the one that failed — what it answered with, and the wrapper turns one into the response, so a handler holds no `try` and calls no `NextResponse`. The error comes from `pasika/http-error` and the wrapper from `pasika/with-response`, the wrapper answers a failure at the status it reported and never lets a cache hold it, so the same URL does not serve one reader's failure to the next.

```ts
import { HttpError } from "pasika/http-error";

// message, status, and — for a failure an upstream call reported — what it answered with
throw new HttpError("The order could not be created.", 502);
```

```ts
import { withResponse } from "pasika/with-response";

// The two forms a handler may return, exported by pasika/with-response
type HandlerResult<TData> =
  // The envelope a JSON route answers with
  | { message: string; data: TData; status?: number; headers?: ResponseHeaders }
  // The response a JSON envelope cannot hold
  | { body: ReadableStream<Uint8Array>; status: number; headers?: ResponseHeaders };
```

A handler returns `{ message, data }`, plus optional `status` and `headers` when the response needs them. A failure has neither: it is built from the caught `HttpError` alone, answered at the error's status with `Cache-Control: no-store`, so an error is never cached as data. A non-JSON response is the handler's own `{ body, status, headers }`, which the wrapper passes through unread:

```ts
export const GET = withResponse(async (request: NextRequest) => {
  const file = await readUpstreamFile(request);

  return { body: file.stream, status: file.status, headers: file.headers };
});
```

A thrown `HttpError` is already the response, so the handler needs no `try`, branch, or loop, and reads as the steps it takes:

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(renderApiResponseDataSchema, async (request: NextRequest) => {
  const userId = await getUserId();
  const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
  const ordersWithJobIds = await createPublicationsForOrders(userId, orders);
  const { jobIds } = await dispatchRenderJobs(userId, ordersWithJobIds);
  return { message: "GitHub Action workflow dispatched successfully.", data: jobIds };
});
```

The handler is written where the route is, so a reader of `route.ts` sees the workflow itself, not one call that hides it. Each step is one awaited call to a module of its own, because a step branches, loops, or catches and a handler may do none of that. A module's name is what separates the two: `readPostSubmission` names one action, so its call is one step, while `submitPosts` on `/api/post` only repeats the route's own subject — and a name no more specific than the route is a workflow hiding behind one await. Give each significant step its own name and await it here.

## Outbound Request Helper

`zodFetch`, imported from `pasika/zod-fetch`, is the helper the Zod Fetch Helper Rule is written against, and the one module in a repository that calls `fetch`. It hands a JSON body back as data the response schema accepted, and a failure back as an `HttpError` carrying the status the upstream reported and what it answered with — its body decoded when that body was JSON, and left as the text it arrived as when it was not.

```ts
import { zodFetch } from "pasika/zod-fetch";

// The options a call may name, exported by pasika/zod-fetch
interface ZodFetchOptions<TSchema extends ZodType = never> {
  url: string | URL;
  init?: RequestInit;
  responseSchema?: TSchema;
}
```

A call site names the schema its data should match, and receives what that schema accepted:

```ts
const orders = await zodFetch({
  url: `${apiBase}/v1/orders`,
  init: { method: "POST", body: JSON.stringify(order) },
  responseSchema: ordersResponseSchema,
});
```

A success that carries no body is that schema's call, so an endpoint answering `204` is read by naming `z.undefined()` for it, while a schema that expects data makes the same answer a failure at the upstream's own status.

A call that names no schema receives the response itself — `{ body, status, headers }` — for a handler whose own response relays a body nothing has read.

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

Packages that never go into package.json. `agent-browser` is invoked by agents during a task.

| Package         | Responsibility                                                |
| --------------- | ------------------------------------------------------------- |
| `agent-browser` | Drives a real browser so an agent can verify browser behavior |
