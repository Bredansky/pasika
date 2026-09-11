# Result Pipeline Rule

Throwing an `HttpError` instead of returning it defeats the Result pipeline: the function's own return type promises a `Result` a caller can check `ok` on, and a throw bypasses that promise entirely.

- A function that constructs an `HttpError` MUST report it through `err`, not `throw` it.

## Incorrect — HttpError Thrown Directly

```ts
// src/utils/dispatch-github-workflow.ts
function checkConfigured(pat: string | undefined): string {
  if (!pat) {
    throw new HttpError("Server not configured for GitHub Actions dispatch.", 500);
  }
  return pat;
}
```

Why: the function throws instead of returning a `Result`, so a caller that only checks `.ok` never sees this failure — it reaches the caller as an uncaught exception instead.

## Correct — HttpError Reported Through `err`

```ts
// src/utils/dispatch-github-workflow.ts
function checkConfigured(pat: string | undefined): Result<string, HttpError> {
  if (!pat) {
    return err(new HttpError("Server not configured for GitHub Actions dispatch.", 500));
  }
  return ok(pat);
}
```

Why: `err` wraps the `HttpError` in the same `Result` shape every other step returns, so a caller's `.ok` check catches it like any other failure.
