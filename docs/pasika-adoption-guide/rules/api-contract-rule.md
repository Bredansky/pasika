# API Contract Rule

Schema-validated JSON endpoints drift when routes and clients restate paths, methods, or schemas independently. This rule keeps one exported API contract as the shared source for those values and treats that contract as schema support for the existing placement rules.

- A schema-validated JSON API contract MUST be created with `defineApiContract` imported from `pasika/api-contract`.
- A call to `defineApiContract` MUST initialize an exported named value.
- A JSON route wrapped in `withResponse` MUST receive an imported API contract rather than a bare response schema or an inline contract.
- A `zodFetch` call that names a request or response schema MUST use an imported API contract through its `contract` option.
- A mock that exports `apiRoutePath` MUST derive it from an imported API contract through `contract.path`.
- That mock MUST validate successful JSON with the same contract's `responseSchema`.

## Incorrect — Route Restates Only The Response Schema

```ts
export const GET = withResponse(ordersResponseSchema, async () => {
  return { data: await listOrders() };
});
```

Why: the route validates one response schema, but nothing ties that schema to the path and method a client uses.

## Correct — Route Imports The Shared Contract

```ts
import { ordersApiContract } from "@/schemas";

export const GET = withResponse(ordersApiContract, async () => {
  return { data: await listOrders() };
});
```

Why: the route consumes the same named contract that other endpoint participants can import.

## Incorrect — Client Restates A Schema-Validated Request

```ts
return zodFetch({
  url: "/api/orders",
  responseSchema: ordersResponseSchema,
});
```

Why: the client repeats the path and response schema independently, so either side can change without the other moving with it.

## Correct — Client Uses The Shared Contract

```ts
import { ordersApiContract } from "@/schemas";

return zodFetch({ contract: ordersApiContract });
```

Why: the contract supplies the path, method, request schema when present, and response schema from one imported value.

## Incorrect — Contract Exists Only Locally

```ts
const ordersApiContract = defineApiContract({
  method: HttpMethod.Get,
  path: "/api/orders",
  responseSchema: ordersResponseSchema,
});
```

Why: a local contract cannot be the shared source for the route and its callers.

## Correct — Contract Is Exported Once

```ts
import { defineApiContract } from "pasika/api-contract";
import { HttpMethod } from "pasika/http-method";

export const ordersApiContract = defineApiContract({
  method: HttpMethod.Get,
  path: "/api/orders",
  responseSchema: ordersResponseSchema,
});
```

Why: one exported value can be imported by every participant instead of recreated.

## Incorrect — Mock Restates The Path Or Skips Response Validation

```ts
export const apiRoutePath = "/api/orders";

export function handleGet() {
  return Response.json([{ id: "1" }]);
}
```

Why: the mock can now drift independently from the route and client even if both use the shared contract.

## Correct — Mock Reuses The Same Contract

```ts
import { ordersApiContract } from "@/schemas";

export const apiRoutePath = ordersApiContract.path;

export function handleGet() {
  return Response.json(ordersApiContract.responseSchema.parse([{ id: "1" }]));
}
```

Why: the mock path and successful response are anchored to the same contract value as the route and client.
