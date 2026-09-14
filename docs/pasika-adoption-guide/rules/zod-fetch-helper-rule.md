# Zod Fetch Helper Rule

Every outbound request repeats the same fetch, status check, decode, and validation, and a failure that collapses into a bare error loses the status the upstream reported. This rule requires the repository's `zodFetch` helper to exist, to be the only caller of `fetch`, and to be the one place an upstream response becomes data or a failure.

- A repository MUST define a `zodFetch` helper, and `fetch` MUST NOT be called outside it.
- The `zodFetch` helper MUST read the response status and throw an error carrying the status an upstream failure reported.
- The `zodFetch` helper MUST validate a JSON body through the response schema before returning it.
- The `zodFetch` helper MUST hand back the body, status, and headers of a response it does not decode, without consuming the body.

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
export async function zodFetch({ url, init, responseSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ZodFetchError(response.status, response.statusText, await response.text());
  }

  return responseSchema.parse(await response.json());
}
```

Why: the failure keeps the upstream status — through an `HttpError` subclass, so a route answers at it — and the body is held to the schema the call site named before anything downstream sees it.

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
export async function zodFetch({ url, init, responseSchema }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ZodFetchError(response.status, response.statusText, await response.text());
  }

  if (!responseSchema) {
    return { body: response.body, status: response.status, headers: response.headers };
  }

  return responseSchema.parse(await response.json());
}
```

Why: a call that names no schema asks for the response itself — its body, status, and headers — so the status is decided before the body is touched, and a caller that has to relay the bytes receives them unread.
