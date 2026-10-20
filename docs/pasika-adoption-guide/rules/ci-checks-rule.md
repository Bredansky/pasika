# CI Checks Rule

CI that skips validation can let broken changes merge. This rule requires GitHub Actions checks for pull requests and branch pushes without modifying tracked files.

- A repository using GitHub Actions MUST run validation for pull requests and pushes to a named branch.
- A repository using GitHub Actions MUST check out the source and install dependencies with `npm ci` before validation.
- A repository using GitHub Actions MUST run `npm run format`, `npm run lint`, `npm run typecheck`, and `npm run test:unit:coverage:check`; if a `build` script exists, CI MUST also run `npm run build`.
- A repository using GitHub Actions MUST declare `test:unit:coverage:check` as a script that disables coverage threshold auto-updates and checks the Git diff after running aggregate coverage.

## Incorrect — Checks Skip Coverage And Formatting

```yaml
on:
  pull_request:
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

Why: lint and typechecking alone miss formatting, coverage regressions, and the build check when available.

## Correct — Checks Run Named Scripts

```yaml
on:
  pull_request:
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm ci
      - run: npm run format
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit:coverage:check
      - run: npm run build
```

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:coverage:check": "npm run test:unit:coverage -- --coverage.thresholds.autoUpdate=false && git diff --exit-code -- vitest.config.ts"
  }
}
```

Why: the named checks cover the repository without updating coverage thresholds, and the final diff check rejects generated configuration changes.
