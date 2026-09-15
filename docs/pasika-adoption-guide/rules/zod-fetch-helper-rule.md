# Zod Fetch Helper Rule

A direct `fetch` call checks nothing about the response it gets back: the status the upstream answered with goes unread, the body goes unvalidated, and a failure means whatever the call site decides it means. This rule requires the repository's `zodFetch` helper to exist, to be the only caller of `fetch`, and to be the one place an upstream response becomes data or a failure.

- A repository MUST define a `zodFetch` helper, and `fetch` MUST NOT be called outside it.
- The `zodFetch` helper MUST read the response status and throw an error carrying the status an upstream failure reported.
- The `zodFetch` helper MUST parse a failed response's body through the error schema its caller named, and throw the message that schema carries.
- The `zodFetch` helper MUST validate a JSON body through the response schema before returning it.
- The `zodFetch` helper MUST hand back the body, status, and headers of a response it does not decode, without consuming the body.
- The `zodFetch` helper MUST parse the body it hands back as a stream before returning it.

## Incorrect — Every Upstream Failure Collapses

```ts
export async function zodFetch({ url, init }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new HttpError("Request failed.", 502);
  }

  return await response.json();
}
```

Why: the status the upstream answered with is replaced by a fixed 502, so a rejected credential, a missing resource, and a rate limit reach the caller as the same failure, and the body is handed back as whatever JSON it happened to be.

## Correct — The Upstream Status Reaches The Caller

```ts
export async function zodFetch({ url, init, responseSchema, errorSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    let message = `Request failed with status ${String(response.status)}`;

    if (errorSchema && body) {
      try {
        const rawData: unknown = JSON.parse(body);
        const parsed = errorSchema.safeParse(rawData);
        if (parsed.success) message = parsed.data.message;
      } catch {
        // A body that is not JSON leaves the fallback message in place.
      }
    }

    throw new HttpError(message, response.status);
  }

  return responseSchema.parse(await response.json());
}
```

Why: the failure keeps the upstream status, so a route answers at it, and the message the upstream sent stands in wherever the schema the call site named accepts it.

## Incorrect — The Failure Keeps Only The Status

```ts
if (!response.ok) {
  throw new HttpError(`Request failed with status ${String(response.status)}`, response.status);
}
```

Why: the status the upstream reported survives, but nothing it said about the failure does, so every call site that wants the upstream's own reason has to read and parse the body itself.

## Correct — The Failure Says What The Upstream Said

```ts
if (!response.ok) {
  const body = await response.text();
  let message = `Request failed with status ${String(response.status)}`;

  if (errorSchema && body) {
    try {
      const rawData: unknown = JSON.parse(body);
      const parsed = errorSchema.safeParse(rawData);
      if (parsed.success) message = parsed.data.message;
    } catch {
      // A body that is not JSON leaves the fallback message in place.
    }
  }

  throw new HttpError(message, response.status);
}
```

Why: the body the upstream sent is held to the schema the call site named, so what that schema accepts becomes the message a caller reads, and a body the schema rejects leaves the failure at the status it reported.

## Incorrect — The Body Decoded Whatever It Turns Out To Be

```ts
export async function zodFetch({ url, init }) {
  const response = await fetch(url, init);
  const data = await response.json();

  return { body: data, status: response.status, headers: response.headers };
}
```

Why: the body is decoded before anything asks what it is, so a call that means to pass a response on — a file proxy relaying a stream — is handed a promise of parsed JSON instead of the bytes, and the decode has already consumed what the caller needed.

## Correct — A Body The Caller Passes On

```ts
const streamBody = z.instanceof(ReadableStream);

export async function zodFetch({ url, init, responseSchema, errorSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    let message = `Request failed with status ${String(response.status)}`;

    if (errorSchema && body) {
      try {
        const rawData: unknown = JSON.parse(body);
        const parsed = errorSchema.safeParse(rawData);
        if (parsed.success) message = parsed.data.message;
      } catch {
        // A body that is not JSON leaves the fallback message in place.
      }
    }

    throw new HttpError(message, response.status);
  }

  if (!responseSchema) {
    const streamed = streamBody.safeParse(response.body);

    if (!streamed.success) {
      throw new HttpError("The upstream answered without a body to relay.", response.status);
    }

    return { body: streamed.data, status: response.status, headers: response.headers };
  }

  return responseSchema.parse(await response.json());
}
```

Why: a call that names no schema asks for the response itself — its body, status, and headers — so the status is decided before the body is touched, and a caller that has to relay the bytes receives them unread and as a stream. An upstream that answers with no body fails at the status it reported, instead of handing the caller nothing to relay.
