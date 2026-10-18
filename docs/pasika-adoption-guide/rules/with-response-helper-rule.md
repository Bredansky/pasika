# With Response Helper Rule

A route that fails has to answer with a status and a message instead of an unhandled error. This rule requires the wrapper a route handler is wrapped in to be the framework's own, so the response it builds is the one the framework's rules describe.

- The `withResponse` a route handler is wrapped in MUST be imported from `pasika/with-response`.
- A repository MUST NOT declare a `withResponse` of its own.
- A call to `withResponse` MUST receive a named handler rather than an inline arrow or function expression.

## Incorrect — A Wrapper The Repository Maintains

```ts
import { NextResponse } from "next/server";

export function withResponse(responseSchema, handler) {
  return async (...args) => {
    try {
      const { data } = await handler(...args);
      return NextResponse.json(responseSchema.parse(data));
    } catch (error) {
      return NextResponse.json({ message: "Request failed." }, { status: 500 });
    }
  };
}
```

Why: every failure leaves at the same status, so the status a delegated module reported never reaches the client, and the copy moves only when this repository moves it.

## Correct — The Framework's Wrapper, Imported

```ts
import { withResponse } from "pasika/with-response";

async function handleCreateOrder(request: NextRequest) {
  const order = await createOrder(request);
  return { data: order, status: 201 };
}

export const POST = withResponse(createOrderApiContract, handleCreateOrder);
```

Why: the framework controls successful and failed responses, and the route passes a named handler instead of hiding the callback body in the wrapper invocation.

## Incorrect — Anonymous Handler Passed Inline

```ts
import { withResponse } from "pasika/with-response";

export const GET = withResponse(streamStatusApiContract, async () => ({
  data: await getLiveStream(),
}));
```

Why: the route hides the handler inside an argument expression, so the workflow is harder to locate, name, and review.

## Correct — Named Handler Passed By Reference

```ts
import { withResponse } from "pasika/with-response";

async function handleGet() {
  return { data: await getLiveStream() };
}

export const GET = withResponse(streamStatusApiContract, handleGet);
```

Why: the call declares the HTTP boundary and names the handler, whose implementation remains visible in `route.ts`.
