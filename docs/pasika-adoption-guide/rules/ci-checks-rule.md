# CI Checks Rule

CI that skips validation can let broken changes merge. This rule requires GitHub Actions checks for pull requests and branch pushes without modifying tracked files.

- A repository using GitHub Actions MUST run validation for pull requests and pushes to a named branch.
- A repository using GitHub Actions MUST check out the source and install dependencies with `npm ci` before validation.
- A repository using GitHub Actions MUST run `npm run format`, `npm run lint`, `npm run typecheck`, and `npm run test:unit:coverage:check`.
- A repository using GitHub Actions MUST declare `test:unit:coverage:check` as a script that disables coverage threshold auto-updates and checks the Git diff after running aggregate coverage.

## Incorrect — CI Allows Coverage Threshold Updates

```json
{
  "scripts": {
    "test:unit:coverage:check": "npm run test:unit:coverage"
  }
}
```

Why: coverage thresholds can change during validation, potentially hiding regressions.

## Correct — CI Preserves Coverage Thresholds

```json
{
  "scripts": {
    "test:unit:coverage:check": "npm run test:unit:coverage -- --coverage.thresholds.autoUpdate=false && git diff --exit-code -- vitest.config.ts"
  }
}
```

Why: coverage runs without updating thresholds, and the diff check rejects configuration changes.
