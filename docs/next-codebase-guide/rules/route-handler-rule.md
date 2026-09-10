# Route Handler Rule

A route handler that keeps parsing, orchestration, external calls, and error handling inline grows without bound, because nothing about `route.ts` gives it a reason to stop. This rule gives route handlers the same extraction trigger the Hook Extraction Rule gives hooks.

- An HTTP method handler exported from `route.ts` MUST be extracted to a named function outside `src/app/` once its imperative weight reaches two, where each awaited call other than one reading the incoming request adds one, and a loop that contains such a call adds one more.

## Incorrect — Imperative Weight of Two Left Inline

```ts
// src/app/api/render-instagram-content/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const jobIds: string[] = [];

  for (const order of body.orders) {
    const publicationId = await createLegacyPublication(order.userId);
    jobIds.push(publicationId);
  }

  await zodFetch({ url: githubApiUrl, init: { method: "POST" }, responseSchema: z.undefined() });

  return NextResponse.json({ jobIds });
}
```

Why: the external dispatch call adds one, and the loop around `createLegacyPublication` adds one more for fanning that call out over every order, reaching the two-point threshold.

## Correct — Complex Handler Extracted

```ts
// src/utils/instagram.ts
export async function dispatchInstagramRenderWorkflow(orders: RenderOrder[]): Promise<{ jobIds: string[] }> {
  const jobIds: string[] = [];

  for (const order of orders) {
    const publicationId = await createLegacyPublication(order.userId);
    jobIds.push(publicationId);
  }

  await zodFetch({ url: githubApiUrl, init: { method: "POST" }, responseSchema: z.undefined() });

  return { jobIds };
}
```

```ts
// src/app/api/render-instagram-content/route.ts
import { dispatchInstagramRenderWorkflow } from "@/utils/instagram";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { jobIds } = await dispatchInstagramRenderWorkflow(body.orders);
  return NextResponse.json({ jobIds });
}
```

Why: the named function owns the publication loop and the external dispatch for one coherent workflow, keeping the route handler focused on parsing the request and shaping the response.

## Incorrect — Single Delegated Call Needlessly Extracted

```ts
// src/utils/get-post-status.ts
export async function getPostStatus(id: string): Promise<{ status: string }> {
  const publication = await getPublicationById(id);
  return { status: publication.status };
}
```

```ts
// src/app/api/post-status/route.ts
import { getPostStatus } from "@/utils/get-post-status";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  return NextResponse.json(await getPostStatus(id));
}
```

Why: the handler's own body has an imperative weight of zero once the single lookup moves out — extracting it added indirection before a threshold required it.

## Correct — Single Delegated Call Inline, Even Wrapped in `try`/`catch`

```ts
// src/app/api/post-status/route.ts
export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get("id") ?? "";

  try {
    const publication = await getPublicationById(id);
    return NextResponse.json({ status: publication.status });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Why: one awaited call has an imperative weight of one, so it stays inline — a `try`/`catch` that only maps that one call's failure to a response is the shape this rule wants, not a second point of weight.
