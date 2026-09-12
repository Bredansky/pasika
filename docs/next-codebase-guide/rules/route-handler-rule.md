# Route Handler Rule

Route handlers grow into application logic, and a failure swallowed inside one is a response the client never gets. This rule keeps a handler to a `withResponse` wrapper and awaited, imported calls.

- An HTTP method handler exported from `route.ts` MUST be wrapped in `withResponse`.
- An `HttpError` constructed inside a `withResponse` pipeline MUST be thrown, not returned.
- A delegated module MUST report a failure by throwing an `HttpError`, not another error type.
- A handler wrapped in `withResponse` MUST NOT contain a `try` statement in its body.
- A function that a handler wrapped in `withResponse` calls MUST be imported, not declared in `route.ts`.
- A handler wrapped in `withResponse` MUST NOT contain a loop in its body.
- A handler wrapped in `withResponse` MUST NOT contain an `if` statement in its body.

## The Error Type

Every failure a route reports travels through the pipeline as an `HttpError`, the one type `withResponse` knows how to turn into a response. A call in the pipeline is usually `async`, so the same failure can arrive as a rejected promise — the handler's `await` rethrows it at the call site, and `withResponse`'s `catch` handles both forms the same way.

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

A module that needs a failure with its own name subclasses `HttpError` rather than `Error`, so the pipeline still carries an error the wrapper recognizes.

## Incorrect — Handler Not Wrapped In `withResponse`

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
  const { jobIds } = await dispatchInstagramRenderWorkflow(userId, orders);
  return NextResponse.json({ data: jobIds, message: "Dispatched." });
});
```

Why: `requireUserId` (inside `withUserId`) throws an `HttpError` on a missing session, and nothing here catches it — it reaches no response at all.

## Correct — The Handler Wrapped In `withResponse`

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

Why: `withResponse` catches any `HttpError` thrown anywhere inside its wrapped function — including one thrown by `withUserId`'s own `requireUserId` — and maps it to a response; the handler itself never needs a `catch` of its own. Its body is nothing but a sequence of `await`ed calls to imported functions, each one's result threaded into the next, ending in the `{ message, data }` that `withResponse` turns into a response.

## Incorrect — HttpError Returned From An `async` Function

```ts
// src/utils/require-session.ts
export async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new HttpError("Unauthorized", 401);
  }
  return session.user.id;
}
```

Why: returning `new HttpError(...)` inside an `async` function resolves `requireUserId`'s promise with that `HttpError` as its value — `await requireUserId()` inside `withUserId` receives it as if it were an ordinary, successful `string`, not a rejection, and passes it on as the "user id" to whatever runs next.

## Correct — HttpError Thrown From An `async` Function

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

Why: throwing rejects `requireUserId`'s promise, so `await requireUserId()` propagates that rejection up through every awaited call above it until it reaches `withResponse`, the same way any other exception does.

## Incorrect — A Delegated Module Throws A Plain Error

```ts
// src/utils/instagram.ts
export async function publishMediaContainer(
  containerId: string,
  credentials: Credentials,
): Promise<InstagramPublishResponse> {
  const res = await fetch(`${facebookGraphBase}/${credentials.accountId}/media_publish`, { method: "POST" });

  if (!res.ok) {
    throw new Error(`Failed to publish container: ${await res.text()}`);
  }

  return instagramPublishResponseSchema.parse(await res.json());
}
```

Why: `/api/instagram-worker`'s handler awaits this call, so `withResponse` is the only thing that can turn the failure into a response — and it recognizes nothing but an `HttpError`. This one it rethrows, and the client gets a bare 500 with none of the `{ data, message }` shape the other failures arrive in.

## Correct — A Delegated Module Throws An `HttpError`

```ts
// src/utils/instagram.ts
export async function publishMediaContainer(
  containerId: string,
  credentials: Credentials,
): Promise<InstagramPublishResponse> {
  const res = await fetch(`${facebookGraphBase}/${credentials.accountId}/media_publish`, { method: "POST" });

  if (!res.ok) {
    throw new HttpError(`Failed to publish container: ${await res.text()}`, res.status);
  }

  return instagramPublishResponseSchema.parse(await res.json());
}
```

Why: `withResponse` maps the thrown `HttpError` to `{ data: null, message }` at the status the upstream API reported, so the failure reaches the client as a response like any other.

## Incorrect — Handler Catches An API Call's Failure Inline

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
    try {
      await dispatchGithubWorkflowRequest(orders);
    } catch (error) {
      throw new HttpError("Failed to dispatch GitHub Action workflow.", 500);
    }
    return { message: "Dispatched.", data: orders.map((order) => order.jobId) };
  }),
);
```

Why: the handler converts a caught failure into an `HttpError` itself, instead of a delegated function doing that conversion and simply throwing.

## Correct — A Delegated Function Converts The Failure

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
    const { jobIds } = await dispatchRenderJobs(userId, orders); // throws HttpError on failure
    return { message: "Dispatched.", data: jobIds };
  }),
);
```

Why: `dispatchRenderJobs` is the one that catches the underlying failure and throws `HttpError`, so the handler's body has no `try` of its own.

## Incorrect — Handler Calls A Function Declared In `route.ts`

```ts
// src/app/api/render-instagram-content/route.ts
async function dispatchWithRetry(orders) {
  return await dispatchGithubWorkflowRequest(orders);
}

export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, orderSchema);
    const result = await dispatchWithRetry(orders);
    return { message: "Dispatched.", data: result };
  }),
);
```

Why: `dispatchWithRetry` is declared in `route.ts` itself, so the same logic this rule bans from the handler's own body — a `try`, a loop, an `if` — can reappear one function away, in the same file.

## Correct — Handler Calls An Imported Function

```ts
// src/app/api/render-instagram-content/route.ts
import { dispatchRenderJobs } from "@/utils/instagram";

export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, orderSchema);
    const { jobIds } = await dispatchRenderJobs(userId, orders);
    return { message: "Dispatched.", data: jobIds };
  }),
);
```

Why: `dispatchRenderJobs` is imported from `@/utils/instagram`, so `route.ts` contains nothing but the wiring between it and `withResponse`.

## Incorrect — Handler Loops Over Its Own Orders

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const body = await request.json();
    const jobIds: string[] = [];

    for (const order of body.orders) {
      jobIds.push(await createLegacyPublication(order));
    }

    return { message: "Dispatched.", data: jobIds };
  }),
);
```

Why: the handler fans the publication call out over every order itself, instead of a delegated module owning that loop.

## Correct — A Delegated Module Owns The Loop

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withResponse(
  schema,
  withUserId(async (userId, request: NextRequest) => {
    const orders = await parseRenderPayload(request, orderSchema);
    const ordersWithJobIds = await createPublicationsForOrders(userId, orders);
    return { message: "Dispatched.", data: ordersWithJobIds.map((order) => order.jobId) };
  }),
);
```

Why: `createPublicationsForOrders` owns the loop over orders, so the handler's body has no loop of its own.

## Incorrect — Handler Branches On A Missing Parameter

```ts
// src/app/api/post-status/route.ts
export const GET = withResponse(
  schema,
  withUserAccount(async (account, request: NextRequest) => {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      throw new HttpError("Missing id", 400);
    }

    const publication = await getPublicationById(id);
    return { message: "Found.", data: publication.status };
  }),
);
```

Why: the handler branches on the request itself, instead of a delegated module reporting a missing id as a thrown failure.

## Correct — A Delegated Module Reports The Missing Parameter

```ts
// src/app/api/post-status/route.ts
export const GET = withResponse(
  schema,
  withUserAccount(async (account, request: NextRequest) => {
    const publication = await getPublicationStatus(request.nextUrl.searchParams.get("id"));
    return { message: "Found.", data: publication.status };
  }),
);
```

Why: `getPublicationStatus` throws an `HttpError` for a missing id, so the handler has no branch of its own.
