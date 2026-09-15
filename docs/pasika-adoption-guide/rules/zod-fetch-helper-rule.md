# Zod Fetch Helper Rule

A direct `fetch` call checks nothing about the response it gets back: the status the upstream answered with goes unread, the body goes unvalidated, and a failure means whatever the call site decides it means. This rule requires the repository's `zodFetch` helper to exist, to be the only caller of `fetch`, and to be the one place an upstream response becomes data or a failure.

- A repository MUST define a `zodFetch` helper, and `fetch` MUST NOT be called outside it.
- The `zodFetch` helper MUST read the response status and throw an error carrying the status an upstream failure reported.
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

Why: the status the upstream answered with is replaced by a fixed 502, so a rejected credential, a missing resource, and a rate limit reach the caller as the same failure, and nothing the upstream said about it survives to be read.

## Correct — The Failure Keeps The Status And The Body

```ts
export async function zodFetch({ url, init, responseSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(`Request failed with status ${String(response.status)}`, response.status, body);
  }

  return responseSchema.parse(await response.json());
}
```

Why: the failure leaves with the status the upstream reported instead of a fixed one, and with the body it answered with on the error's `data`, so a route answers at the upstream's own status, a log line has what the upstream said, and a module that knows that upstream's failure shape reads the reason out of it.

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

export async function zodFetch({ url, init, responseSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(`Request failed with status ${String(response.status)}`, response.status, body);
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
