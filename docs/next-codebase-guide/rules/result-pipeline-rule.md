# Result Pipeline Rule

A route handler that has no `try`, loop, or `if` of its own only works if the modules it delegates to report their own outcome as a value instead of throwing. This rule requires the project's Result-pipeline helpers to match the shape that guarantee depends on.

- The project's `ok` helper MUST return `{ ok: true, value }`.
- The project's `err` helper MUST return `{ ok: false, error }`.
- The project's `andThen` helper MUST run its next step only once the previous outcome's `ok` is true.
- The project's `HttpError` class MUST carry a `status`.
- The project's `respond` helper MUST branch on `ok` and resolve through `NextResponse.json`.

## Incorrect — `ok`/`err` Without An `ok` Flag

```ts
// src/utils/result.ts
export function ok<T>(value: T) {
  return { success: true, value };
}

export function err<E>(error: E) {
  return { success: false, error };
}
```

Why: nothing named `ok` on the returned value, so a caller has no single field every outcome shares to branch on.

## Correct — `ok`/`err` Share An `ok` Flag

```ts
// src/utils/result.ts
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

Why: both outcomes carry `ok`, so any caller can branch on the same field regardless of which one it received.

## Incorrect — `andThen` Runs Its Next Step Unconditionally

```ts
// src/utils/result.ts
export async function andThen<T, U, E>(
  result: Result<T, E>,
  next: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  return next(result.value);
}
```

Why: `next` runs even when `result` failed, so a failed step's error is discarded instead of short-circuiting the chain.

## Correct — `andThen` Branches On `ok`

```ts
// src/utils/result.ts
export async function andThen<T, U, E>(
  result: Result<T, E>,
  next: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  return result.ok ? next(result.value) : result;
}
```

Why: `next` only runs once `result.ok` is true, so a failed step's error passes through unchanged.

## Incorrect — `HttpError` Carries No Status

```ts
// src/utils/http-error.ts
export class HttpError extends Error {}
```

Why: nothing on the error says which HTTP status it should become, so every catch site has to invent its own status.

## Correct — `HttpError` Carries A Status

```ts
// src/utils/http-error.ts
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
```

Why: `status` travels with the error, so a module that throws it has already decided the response code.

## Incorrect — `respond` Ignores `ok`

```ts
// src/utils/respond.ts
export function respond<T, TData>(
  result: Result<T, HttpError>,
  onSuccess: (value: T) => { message: string; data: TData },
): NextResponse<{ data: TData | null; status: number; message: string }> {
  const { message, data } = onSuccess(result.value);
  return NextResponse.json({ data, status: 200, message });
}
```

Why: `onSuccess` runs on every result, including a failed one whose `value` does not exist, instead of a failed result becoming an error response.

## Correct — `respond` Branches On `ok`

```ts
// src/utils/respond.ts
export function respond<T, TData>(
  result: Result<T, HttpError>,
  onSuccess: (value: T) => { message: string; data: TData },
): NextResponse<{ data: TData | null; status: number; message: string }> {
  if (!result.ok) {
    const { status, message } = result.error;
    return NextResponse.json({ data: null, status, message }, { status });
  }

  const { message, data } = onSuccess(result.value);
  return NextResponse.json({ data, status: 200, message });
}
```

Why: a failed result returns its own error response with `data: null`, and only a successful one reaches `onSuccess`.
