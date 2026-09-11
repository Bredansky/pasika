# Route Handler Rule

A route handler that catches its own failures, branches on them, or builds its own response grows without bound, and a thrown `HttpError` that never reaches a boundary reaches no response at all.

- An HTTP method handler exported from `route.ts` MUST be wrapped in `withResponse`.
- A handler wrapped in `withResponse` MUST NOT contain a `try` statement in its body.
- A handler wrapped in `withResponse` MUST NOT contain a loop in its body.
- A handler wrapped in `withResponse` MUST NOT contain an `if` statement in its body.
- A handler wrapped in `withResponse` MUST NOT contain a `NextResponse.json` call in its body.
- A constructed `HttpError` MUST be thrown, not returned.

## Incorrect — Handler Catches Its Own Failures

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  try {
    const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
    const { jobIds } = await dispatchInstagramRenderWorkflow(userId, orders);
    return NextResponse.json({ data: jobIds, message: "Dispatched." });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
});
```

Why: `requireUserId` (inside `withUserId`) throws an `HttpError` on a missing session, and nothing here catches it — it reaches no response at all. The handler's own `catch` only covers what runs inside its `try`.

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

Why: `withResponse` catches any `HttpError` thrown anywhere inside its wrapped function — including one thrown by `withUserId`'s own `requireUserId` — and maps it to a response; the handler itself never needs a `catch` of its own.

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

## Incorrect — Handler Constructs Its Own Response

```ts
// src/app/api/health/route.ts
export const GET = withResponse(statusDataSchema, async (): Promise<NextResponse<{ status: string }>> => {
  const status = await getStatus();
  return NextResponse.json({ status });
});
```

Why: the handler builds and returns its own `NextResponse`, duplicating what `withResponse` already does — and bypassing the schema validation `withResponse` runs against its returned value.

## Correct — Handler Resolves Through `withResponse`

```ts
// src/app/api/health/route.ts
export const GET = withResponse(statusDataSchema, async () => {
  const status = await getStatus();
  return { message: "OK.", data: status };
});
```

Why: `withResponse` is the one place that turns the handler's returned `{ message, data }` into a validated `NextResponse`, so the handler never constructs or types one itself.

## Incorrect — HttpError Returned Instead Of Thrown

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

Why: nothing catches a returned value — a caller composing `await readGithubDispatchConfig()` in sequence never sees this failure, and it reaches no boundary at all.

## Correct — HttpError Thrown

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
