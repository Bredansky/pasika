# Zod Fetch Helper Rule

A direct `fetch` call checks nothing about the response it gets back: the status the upstream answered with goes unread, the body goes unvalidated, and a failure means whatever the call site decides it means. This rule requires every outbound request to go through the `zodFetch` the framework ships, the only caller of `fetch` and the one place an upstream response becomes data or a failure.

- A file MUST NOT call `fetch`.
- A file MUST import `zodFetch` from `pasika/zod-fetch` and MUST NOT declare one of its own.

## Incorrect — The Request The Module Makes Itself

```ts
const response = await fetch(`${apiBase}/orders`);

if (!response.ok) {
  throw new HttpError("Request failed.", 502);
}

const orders = await response.json();
```

Why: the call decides the status a failure leaves with and drops the body the upstream answered with, so a rate limit and a missing resource reach the caller as the same 502 with nothing left to read.

## Correct — The Request Through The Framework's Helper

```ts
import { zodFetch } from "pasika/zod-fetch";

const orders = await zodFetch({
  url: `${apiBase}/orders`,
  responseSchema: ordersResponseSchema,
});
```

Why: the body is validated through the schema the call site named, and a failure leaves with the status the upstream reported and what it answered with.

## Incorrect — A Local Copy Of The Helper

```ts
export async function zodFetch({ url, init }) {
  const response = await fetch(url, init);

  return await response.json();
}
```

Why: the repository keeps a copy that makes its own call and decides its own failure, so the framework's fixes stop at the copy and every call site keeps whatever this one does.

## Correct — The Imported Helper

```ts
import { zodFetch } from "pasika/zod-fetch";

export async function fetchOrder(orderId: string) {
  return zodFetch({ url: `${apiBase}/orders/${orderId}`, responseSchema: orderResponseSchema });
}
```

Why: nothing in the repository calls `fetch` on its own, so every request is checked, validated, and answered for the same way.
