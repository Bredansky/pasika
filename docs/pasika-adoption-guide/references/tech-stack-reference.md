# Tech Stack Reference

Use this reference to look up the packages the framework's documentation depends on and what each one is responsible for, and the hand-authored helpers a repository writes itself to the exact shape the framework's rules assume. Each package table groups packages by how a repository declares them — in `dependencies`, in `devDependencies`, or not at all — and each hand-authored helper is shown by its file name and contents only, since the folder it sits in follows from its consumers.

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
// cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Route Error Handling Helpers

`HttpError` and `withResponse` are the helpers the Route Handler Rule is written against. `HttpError` carries the status a failure should become; `withResponse` catches an `HttpError` thrown anywhere inside its wrapped function, validates the handler's returned data against a schema, and builds the `{ data, message }` response itself, so the handler never calls `NextResponse.json` at all, and a failure it catches is the one response a cache may never keep.

```ts
// http-error.ts
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
// with-response.ts
const streamBody = z.instanceof(ReadableStream);

type HandlerResult<TData> =
  | { message: string; data: TData; status?: number; headers?: HeadersInit }
  | { body: TData; status: number; headers?: HeadersInit };

type AnyHandler = (...args: unknown[]) => Promise<HandlerResult<unknown>>;

export function withResponse<TSchema extends z.ZodType, Args extends unknown[]>(
  responseSchema: TSchema,
  handler: (...args: Args) => Promise<HandlerResult<z.input<TSchema>>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse<Args extends unknown[]>(
  handler: (...args: Args) => Promise<HandlerResult<ReadableStream>>,
): (...args: Args) => Promise<NextResponse>;
export function withResponse(responseSchema?: z.ZodType | AnyHandler, handler?: AnyHandler) {
  const respond =
    (schema: z.ZodType, wrapped: AnyHandler) =>
    async (...requestArgs: unknown[]): Promise<NextResponse> => {
      try {
        const result = await wrapped(...requestArgs);

        // A result carrying a body is the response a JSON envelope cannot hold.
        if ("body" in result) {
          const { body, status, headers } = result;
          return new NextResponse(streamBody.parse(body), { status, headers });
        }

        const { message, data, status, headers } = result;
        return NextResponse.json({ data: schema.parse(data), message }, { status, headers });
      } catch (error) {
        if (error instanceof HttpError) {
          return NextResponse.json(
            { data: null, message: error.message },
            { status: error.status, headers: { "Cache-Control": "no-store" } },
          );
        }

        throw error;
      }
    };

  // A function in the schema slot is the streamed overload: the handler came
  // first, and the stream contract stands in for the response schema.
  if (typeof responseSchema === "function") {
    return respond(streamBody, responseSchema);
  }

  if (!responseSchema || !handler) {
    return () => {
      throw new HttpError("withResponse requires a response schema and a handler.", 500);
    };
  }

  return respond(responseSchema, handler);
}
```

A handler returns `{ message, data }`, plus optional `status` and `headers` when the response needs them. A failure has neither: it is built from the caught `HttpError` alone, answered at the error's status with `Cache-Control: no-store`, so an error is never cached as data. For a non-JSON response, call `withResponse` with the handler alone and return `{ body, status, headers }` — the body passes through without a JSON envelope.

A route handler wrapped in `withResponse` has no `try`, loop, or `if` of its own — every delegated call is a bare `await`, since a thrown `HttpError` already short-circuits the rest:

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

Write the handler at the `withResponse` call, never as an imported reference. Its body is one awaited call per step, and each step lives in a module of its own — steps branch, loop, and catch, and a handler may do none of that. One step means one call; the module's name is the test. `readPostSubmission` names one action, so its call is one step. `submitPosts` on `/api/post` just restates the route's own subject — that is bad: significant steps are hidden behind one await, and the reader cannot see them. Name each significant step and await it in the handler instead, each call going to its own module.

## Outbound Request Helper

`zodFetch` is the helper the Zod Fetch Helper Rule is written against, and the one module in a repository that calls `fetch`. It hands a JSON body back as data the response schema accepted, and a failure back as an `HttpError` subclass carrying the status the upstream reported.

```ts
// zod-fetch.ts
import { type z, type ZodType } from "zod";
import { HttpError } from "./http-error";

interface ZodFetchOptions<TSchema extends ZodType> {
  url: string | URL;
  init?: RequestInit;
  responseSchema?: TSchema;
}

/** Extends HttpError so the status an upstream API reported reaches the client. */
export class ZodFetchError extends HttpError {
  public constructor(
    status: number,
    public readonly statusText: string,
    public readonly body: string,
  ) {
    super(`Request failed with status ${String(status)}${statusText ? ` ${statusText}` : ""}`, status);
    this.name = "ZodFetchError";
  }
}

export async function zodFetch<TSchema extends ZodType>(
  options: ZodFetchOptions<TSchema>,
): Promise<z.output<TSchema> | { body: ReadableStream<Uint8Array> | null; status: number; headers: Headers }> {
  const response = await fetch(options.url, options.init);

  if (!response.ok) {
    throw new ZodFetchError(response.status, response.statusText, await response.text());
  }

  if (!options.responseSchema) {
    return { body: response.body, status: response.status, headers: response.headers };
  }

  return options.responseSchema.parse(await response.json());
}
```

The three parts of that body match the three things a call site can ask for. A call that names a `responseSchema` gets the decoded body validated against it, so a shape the contract does not allow fails where the request was made rather than in the caller. A call that names none gets the response itself — its `body`, `status`, and `headers` — which is the same triple a handler hands `withResponse` when its own response is not JSON, so a file proxy relays a stream nothing has read. And a status that is not ok throws before either branch, so the upstream status is decided before the body is touched, and the failure reaches the route as the status the upstream reported.

The error a failed request throws is a subclass of `HttpError`, so the wrapper the Route Handler Rule requires answers it at that status without this helper knowing about routes at all:

```ts
// src/features/publishing/utils/instagram.ts
const container = await zodFetch({
  url: `${facebookGraphBase}/${accountId}/media`,
  init: { method: "POST", body: params },
  responseSchema: instagramMediaContainerResponseSchema,
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
