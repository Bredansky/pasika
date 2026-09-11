# Route Handler Rule

An `HttpError` that never reaches `withResponse` — because nothing wraps the handler, or because a function handed it back as a value instead of throwing it — produces no response at all. A handler that catches its own failures, branches on them, loops over them, or hides them in a same-file helper grows without bound instead of staying a thin wire between delegated calls.

- An HTTP method handler exported from `route.ts` MUST be wrapped in `withResponse`.
- A function that constructs an `HttpError` MUST throw it, not return it.
- A handler wrapped in `withResponse` MUST NOT contain a `try` statement in its body.
- A function that a handler wrapped in `withResponse` calls MUST be imported, not declared in `route.ts`.
- A handler wrapped in `withResponse` MUST NOT contain a loop in its body.
- A handler wrapped in `withResponse` MUST NOT contain an `if` statement in its body.

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

## Incorrect — Delegated Function Returns HttpError Instead Of Throwing

```ts
// src/utils/dispatch-github-workflow.ts
function readGithubDispatchConfig(): GithubDispatchConfig {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return new HttpError("Server not configured for GitHub Actions dispatch.", 500);
  }
  return { pat };
}
```

Why: nothing catches a returned value — a caller composing `await readGithubDispatchConfig()` in sequence never sees this failure, and it reaches no boundary at all, the same as if the handler itself were never wrapped in `withResponse`.

## Correct — Delegated Function Throws HttpError

```ts
// src/utils/dispatch-github-workflow.ts
function readGithubDispatchConfig(): GithubDispatchConfig {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    throw new HttpError("Server not configured for GitHub Actions dispatch.", 500);
  }
  return { pat };
}
```

Why: a thrown `HttpError` propagates through every awaited call above it until it reaches `withResponse`, the same way any other exception does.

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
