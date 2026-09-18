# With Response Helper Rule

A route that fails has to answer with a status and a message instead of an unhandled error. This rule requires the wrapper a route handler is wrapped in to be the framework's own, so the response it builds is the one the framework's rules describe.

- The `withResponse` a route handler is wrapped in MUST be imported from `pasika/with-response`.
- A repository MUST NOT declare a `withResponse` of its own.

## Incorrect — A Wrapper The Repository Maintains

```ts
import { NextResponse } from "next/server";

export function withResponse(responseSchema, handler) {
  return async (...args) => {
    try {
      const { data } = await handler(...args);
      return NextResponse.json({ success: true, data: responseSchema.parse(data) });
    } catch (error) {
      return NextResponse.json({ success: false, data: null, message: "Request failed." }, { status: 500 });
    }
  };
}
```

Why: every failure leaves at the same status, so the status a delegated module reported never reaches the client, and the copy moves only when this repository moves it.

## Correct — The Framework's Wrapper, Imported

```ts
import { withResponse } from "pasika/with-response";

export const POST = withResponse(createOrderResponseSchema, async (request: NextRequest) => {
  const order = await createOrder(request);

  return { data: order, status: 201 };
});
```

Why: the response body, the failure envelope, and the status a failure carries are the framework's, and the route names no wrapper of its own.
