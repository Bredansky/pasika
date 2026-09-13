# With Response Helper Rule

A route that fails has to answer with a status and a message instead of an unhandled error. This rule requires the repository's `withResponse` helper to exist and to be the boundary that turns a handler's result, or a failure thrown under it, into a response.

- A repository MUST define a `withResponse` helper.
- The `withResponse` helper MUST await the handler, validate its returned data through the response schema, answer a thrown `HttpError` at `error.status` with `{ data: null, message }`, and rethrow anything else.

## Incorrect — Every Failure Answers Alike

```ts
export function withResponse(responseSchema, handler) {
  return async (...args) => {
    try {
      const { message, data } = await handler(...args);
      return NextResponse.json({ data: responseSchema.parse(data), message });
    } catch (error) {
      return NextResponse.json({ data: null, message: "Request failed." }, { status: 500 });
    }
  };
}
```

Why: a missing session, a rejected credential, and a programming mistake all leave the route as the same 500, so the status a failure carried never reaches the client and nothing above the route can tell a modeled failure from a bug.

## Correct — The Failure Keeps Its Own Status

```ts
export function withResponse(responseSchema, handler) {
  return async (...args) => {
    try {
      const { message, data } = await handler(...args);
      return NextResponse.json({ data: responseSchema.parse(data), message });
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ data: null, message: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}
```

Why: the handler's data is validated against the response schema before it becomes a body, an `HttpError` becomes the `{ data: null, message }` response at the status it carries, and any other error stays an error.
