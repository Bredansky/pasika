# CI Checks Rule

GitHub Actions must protect changes independently of the local Husky hook. This rule reads the repository's workflow YAML while linting package.json, so job names, step names, and workflow filenames remain repository-owned.

- A repository using GitHub Actions MUST run validation for pull requests and pushes to a named branch.
- A repository using GitHub Actions MUST check out the source and install dependencies with `npm ci` before validation.
- A repository using GitHub Actions MUST run `npm run format`, `npm run lint`, `npm run typecheck`, and `npm run test:unit:coverage:check`; when `build` or `test:requirements` scripts exist, CI MUST run those too.
- A repository using GitHub Actions MUST declare `test:unit:coverage:check` as a script that disables coverage threshold auto-updates and checks the Git diff after running aggregate coverage.
- A repository that publishes through GitHub Actions MUST expose the checks as a reusable `workflow_call` and make its publishing job depend on a job that invokes those checks.

## Incorrect — The CI Workflow Omits Coverage

```yaml
on:
  pull_request:
  push:
    branches: [main]

jobs:
  validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

Why: a successful lint and typecheck do not prove that unit coverage, formatting, requirements, or the build passed.

## Correct — Shared Checks Verify Named Scripts

```yaml
on:
  workflow_call:
  pull_request:
  push:
    branches: [main]

jobs:
  validation:
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

Why: CI runs the same named checks as the local toolchain but disables coverage updates, so committed thresholds remain the source of truth. Repositories with `test:requirements` also run that script.

## Incorrect — Publishing Runs Without Checks

```yaml
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - run: npm publish
```

Why: a release tag could publish without proving the full validation job succeeded.

## Correct — Publishing Depends on Reused Checks

```yaml
on:
  push:
    tags: ["v*"]

jobs:
  validation:
    uses: ./.github/workflows/checks.yml
  publish:
    needs: validation
    runs-on: ubuntu-latest
    steps:
      - run: npm publish
```

Why: publishing waits for reusable checks, and the workflow path is resolved from this repository rather than required by Pasika. Husky still owns `vulyk sync`, `vulyk agents`, `vulyk stage`, autofixes, and local coverage updates.
