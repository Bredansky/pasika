# Zod Fetch Helper Rule

A direct `fetch` call checks nothing about the response it gets back: the status the upstream answered with goes unread, the body goes unvalidated, and a failure means whatever the call site decides it means. This rule requires the repository's `zodFetch` helper to exist, to be the only caller of `fetch`, and to be the one place an upstream response becomes data or a failure.

- A repository MUST define a `zodFetch` helper, and `fetch` MUST NOT be called outside it.
- The `zodFetch` helper MUST read the response status and throw an error carrying the status an upstream failure reported.
- The `zodFetch` helper MUST parse a failed response's body through the error schema its caller named, and carry what that schema accepted on the error it throws.
- The `zodFetch` helper MUST carry the body a failed response answered with on the error it throws.
- The `zodFetch` helper MUST validate a JSON body through the response schema before returning it.
- The `zodFetch` helper MUST hand back the body, status, and headers of the response when the caller named no response schema.
- The `zodFetch` helper MUST NOT decode the body it hands back.
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

## Correct — The Upstream Status And Body Reach The Caller

```ts
export async function zodFetch({ url, init, responseSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ZodFetchError(response.status, response.statusText, await response.text());
  }

  return responseSchema.parse(await response.json());
}
```

Why: the failure leaves with the status the upstream reported instead of a fixed one, and with the body it answered with, so a route answers at the upstream's own status and a caller can read what the upstream said rather than guessing at it.

## Incorrect — The Failure Carries Only The Status

```ts
if (!response.ok) {
  throw new HttpError(`Request failed with status ${String(response.status)}`, response.status);
}
```

Why: the status the upstream reported survives, but nothing it said about the failure does — a log line has no body to print, and a module that knows the upstream's failure shape has nothing to read the reason out of.

## Correct — The Failure Carries The Body And What The Schema Accepted

```ts
if (!response.ok) {
  const body = await response.text();
  let data: unknown;

  if (errorSchema && body) {
    try {
      data = errorSchema.parse(JSON.parse(body));
    } catch {
      // A body that is not JSON, or one the schema rejects, leaves the body alone.
    }
  }

  throw new ZodFetchError(response.status, response.statusText, body, data);
}
```

Why: the body the upstream answered with rides on the error, and what the caller's error schema accepted of it rides next to it, so a module that knows that upstream's failure shape names the reason for a user while the status stays the upstream's — and a body no schema accepts still reaches a log line.

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
    let data: unknown;

    if (errorSchema && body) {
      try {
        data = errorSchema.parse(JSON.parse(body));
      } catch {
        // A body that is not JSON, or one the schema rejects, leaves the body alone.
      }
    }

    throw new ZodFetchError(response.status, response.statusText, body, data);
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
