# Route Handler Rule

A route handler that keeps its own branching, looping, or failure handling grows without bound, and an untyped return leaves its response contract implicit.

- An HTTP method handler exported from `route.ts` MUST NOT contain a `try` statement in its body.
- An HTTP method handler exported from `route.ts` MUST NOT contain a loop in its body.
- An HTTP method handler exported from `route.ts` MUST NOT contain an `if` statement in its body.
- An HTTP method handler exported from `route.ts` MUST NOT contain a `NextResponse.json` call in its body.
- An HTTP method handler exported from `route.ts` MUST thread every delegated call after its first through `andThen`.
- An HTTP method handler exported from `route.ts` MUST resolve its response by calling `respond`.
- An HTTP method handler exported from `route.ts` MUST declare its return type as `Promise<NextResponse<X>>` with a concrete `X`.

## Incorrect — Handler Catches Its Own Failures

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  try {
    const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
    const { jobIds } = await dispatchInstagramRenderWorkflow(userId, orders);
    return NextResponse.json({ success: true, message: "dispatched", status: "dispatched", jobIds });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
});
```

Why: the handler catches whatever either call throws, so a new failure mode added to either one silently falls into the same generic catch instead of the handler ever noticing.

## Correct — Delegated Modules Report Their Own Failures

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  const parsed = await parseRenderPayload(request, instagramRenderOrderSchema);
  const published = await andThen(parsed, (orders) => createPublicationsForOrders(userId, orders));
  const result = await andThen(published, (orders) => dispatchRenderJobs(userId, orders));
  return respond(result, ({ jobIds }) => ({
    message: "GitHub Action workflow dispatched successfully.",
    data: jobIds,
  }));
});
```

Why: `parseRenderPayload`, `createPublicationsForOrders`, and `dispatchRenderJobs` each report their own outcome as a value, so the handler chains them without a catch of its own.

## Incorrect — Two Delegated Calls Awaited Directly

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  const orders = await parseRenderPayload(request, instagramRenderOrderSchema);
  const { jobIds } = await createPublicationsForOrders(userId, orders);
  return respond(ok(jobIds), (value) => ({ message: "Dispatched.", data: value }));
});
```

Why: `createPublicationsForOrders` runs unconditionally even when `parseRenderPayload` failed, since nothing threads its outcome into the next call.

## Correct — The Second Call Threaded Through `andThen`

```ts
// src/app/api/render-instagram-content/route.ts
export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
  const parsed = await parseRenderPayload(request, instagramRenderOrderSchema);
  const published = await andThen(parsed, (orders) => createPublicationsForOrders(userId, orders));
  return respond(published, ({ jobIds }) => ({ message: "Dispatched.", data: jobIds }));
});
```

Why: `andThen` only calls `createPublicationsForOrders` once `parseRenderPayload`'s outcome is `ok`, so a parse failure short-circuits before reaching the second call.

## Incorrect — Handler Loops Over Its Own Orders

```ts
// src/app/api/render-instagram-content/route.ts
export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
  const body = await request.json();
  const jobIds: string[] = [];

  for (const order of body.orders) {
    jobIds.push(await createLegacyPublication(order));
  }

  return NextResponse.json({ jobIds });
}
```

Why: the handler fans the publication call out over every order itself, instead of a delegated module owning that loop.

## Correct — A Delegated Module Owns The Loop

```ts
// src/app/api/render-instagram-content/route.ts
export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ data: string[] | null; status: number; message: string }>> {
  const body = await request.json();
  const result = await createPublicationsForOrders(body.orders);
  return respond(result, ({ jobIds }) => ({ message: "Publications created.", data: jobIds }));
}
```

Why: `createPublicationsForOrders` owns the loop over orders, so the handler's body has no loop of its own.

## Incorrect — Handler Branches On A Missing Parameter

```ts
// src/app/api/post-status/route.ts
export async function GET(request: NextRequest): Promise<NextResponse<{ status: string } | { error: string }>> {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const publication = await getPublicationById(id);
  return NextResponse.json({ status: publication.status });
}
```

Why: the handler branches on the request itself, instead of a delegated module reporting a missing id as a failed outcome.

## Correct — A Delegated Module Reports The Missing Parameter

```ts
// src/app/api/post-status/route.ts
export async function GET(
  request: NextRequest,
): Promise<NextResponse<{ data: string | null; status: number; message: string }>> {
  const result = await getPublicationStatus(request.nextUrl.searchParams.get("id"));
  return respond(result, (publication) => ({ message: "Found.", data: publication.status }));
}
```

Why: `getPublicationStatus` reports a missing id as a failed outcome, so the handler has no branch of its own.

## Incorrect — Handler Constructs Its Own Response

```ts
// src/app/api/health/route.ts
export async function GET(request: NextRequest): Promise<NextResponse<{ status: string }>> {
  const result = await getStatus();
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ status: result.value });
}
```

Why: the handler builds its own success and failure responses from `result`, duplicating what `respond` already does for every route.

## Correct — Handler Resolves Through `respond`

```ts
// src/app/api/health/route.ts
export async function GET(
  request: NextRequest,
): Promise<NextResponse<{ data: string | null; status: number; message: string }>> {
  const result = await getStatus();
  return respond(result, (status) => ({ message: "OK.", data: status }));
}
```

Why: `respond` is the one place that turns `result` into a `NextResponse`, so the handler never constructs one itself.

## Incorrect — Return Type Omitted

```ts
// src/app/api/health/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
```

Why: nothing states the handler's response contract, so a later change can alter the response shape without anything noticing.

## Correct — Return Typed As `Promise<NextResponse<X>>`

```ts
// src/app/api/health/route.ts
export async function GET(
  request: NextRequest,
): Promise<NextResponse<{ data: string | null; status: number; message: string }>> {
  return respond(ok("ok"), (status) => ({ message: "OK.", data: status }));
}
```

Why: the return type commits the handler to a concrete response shape.
