# Glossary Reference

Use this reference to look up the terms this guide's workflows and rules use. Terms are grouped by the decision they support.

## Structure Terms

These terms name the parts of the `src/` tree and the way an item's location is derived from its consumers.

| Term                        | Definition                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Layer                       | One of the five scopes an item can belong to: `app`, `compositions`, `features`, `shared`, or `root`.           |
| Feature                     | One folder under `src/features/` holding the components and support files of a single product capability.       |
| Composition                 | A component that imports from two or more feature folders.                                                      |
| Support file                | A hook, type, schema, constant, or pure function that supports other code rather than rendering UI.             |
| Support folder              | A folder named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/` that holds support files of that kind. |
| Closest common folder (CCF) | The closest folder under `src/` shared by every file that uses an item.                                         |
| Configuration module        | An app-wide module under `src/config/<config-name>/` that selects or parameterizes application behavior.        |
| Barrel                      | An `index.ts` whose only content is re-exports of other modules.                                                |

## Component Terms

These terms name the component classifications and the extraction triggers this guide's workflows use.

| Term                         | Definition                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smart component              | A component that fetches data, or that defines `handle*` callbacks and passes them to children as `on*` props.                                                                                                                                        |
| Dumb component               | A component that neither fetches data nor defines `handle*` callbacks for children.                                                                                                                                                                   |
| Exclusive child component    | A component imported only by its parent component.                                                                                                                                                                                                    |
| Nested component             | A component that lives in a folder carrying its own name, together with its exclusive children and their support files.                                                                                                                               |
| Interactive element          | An HTML element the HTML specification lists as [interactive content](https://html.spec.whatwg.org/multipage/dom.html#interactive-content).                                                                                                           |
| Imperative category          | One of five things that each add one point to a hook's extraction score, no matter how many times it happens: calling two or more distinct built-in hooks, subscribing, doing external I/O, manipulating the DOM, or managing a resource's lifecycle. |
| Subscriptions                | Event listeners and registration or cleanup APIs such as `on()`, `off()`, `addEventListener()`, or `removeEventListener()`.                                                                                                                           |
| External I/O and persistence | An `await`ed expression, a `fetch()` call, or a call on `localStorage`, `sessionStorage`, or `indexedDB`.                                                                                                                                             |
| DOM manipulation             | Imperative DOM APIs such as `focus()`, `blur()`, `scrollIntoView()`, `click()`, `classList`, or constructing a `MutationObserver`, `ResizeObserver`, or `IntersectionObserver`.                                                                       |
| Resource lifecycle           | Setup and teardown APIs such as `load()`, `destroy()`, `dispose()`, `close()`, `cleanup()`, or `unmount()`.                                                                                                                                           |
| Extraction score             | A count a rule computes from its own signals to decide whether code needs to be extracted; reaching two triggers extraction.                                                                                                                          |

## Result Pipeline Helpers

`ok`, `err`, `andThen`, `HttpError`, and `respond` are the helpers the Route Handler and Result Pipeline Rules are written against. `ok`/`err` wrap a step's outcome as a `{ ok, value }`/`{ ok, error }` value, `andThen` chains a next step only once the previous one's `ok` is true, `HttpError` carries the status a failure should become, and `respond` turns the pipeline's final Result into a `NextResponse` — the one place a route's `{ data, status, message }` envelope gets built.

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
