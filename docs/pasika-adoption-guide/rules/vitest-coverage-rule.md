# Vitest Coverage Rule

Coverage that measures nothing still passes. This rule requires a repository's test runner and coverage thresholds to actually gate its test run, whether or not it is a Next.js application.

- A repository MUST declare `vitest` and `@vitest/coverage-v8` in devDependencies.
- A repository MUST declare a `test:unit` script in package.json that runs Vitest without coverage.
- A repository MUST declare a `test:unit:coverage` script in package.json that runs Vitest with coverage.
- A repository MUST configure its vitest config with a coverage threshold above zero for lines, functions, branches, and statements.
- A repository MUST measure coverage of its source files, not its test files.
- A repository MUST set `coverage.thresholds.autoUpdate` to `true` in its vitest config, so a threshold only ever rises with measured coverage and a regression fails the run instead of silently lowering it.
- A repository MUST declare a `test:unit:coverage:changed` script in package.json that runs Vitest with coverage, and configure its vitest config with `coverage.changed` and a `coverage.thresholds.perFile` of at least `80` for lines, functions, branches, and statements, so a new or modified file must be well-tested before it can land.

## Incorrect — Threshold Fixed in Place, No Gate on New Files

```ts
// vitest.config.ts
coverage: {
  thresholds: { lines: 9, functions: 8, branches: 6, statements: 9 },
},
```

Why: coverage can climb well past `9`% without the threshold ever reflecting it, so a later regression back down to `9`% still passes — and nothing stops a new file from landing at `0`% as long as the aggregate holds.

## Correct — Threshold Rises With Coverage, New Files Gated at 80%

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:coverage:changed": "COVERAGE_MODE=changed vitest run --coverage"
  }
}
```

```ts
// vitest.config.ts
const changedRun = process.env.COVERAGE_MODE === "changed";

coverage: {
  changed: changedRun ? (process.env.CI === "true" ? (process.env.GITHUB_BASE_REF ?? "main") : true) : undefined,
  thresholds: changedRun
    ? { perFile: true, lines: 80, functions: 80, branches: 80, statements: 80 }
    : { lines: 9, functions: 8, branches: 6, statements: 9, autoUpdate: true },
},
```

Why: `autoUpdate` rewrites the stored thresholds up when coverage improves and fails the run if coverage ever drops below the last stored value, so the floor only ever rises. `test:unit:coverage:changed` sets `COVERAGE_MODE=changed` and scopes `coverage.changed` to the repository's own uncommitted changes locally, or to the pull request's base branch in CI, so `perFile`'s 80% floor applies only to files that actually changed — the normal `test:unit:coverage` run keeps checking the whole repository's aggregate, unaffected by `changed`.

## Incorrect — Coverage Package Missing, Threshold Left at Zero

```json
{
  "scripts": {
    "test:unit": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "4.1.5"
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
    },
  },
});
```

Why: the normal unit-test command unnecessarily collects coverage, the coverage-specific command is absent, `@vitest/coverage-v8` is absent from `devDependencies`, and every threshold is `0`, so there is no correctly named coverage gate.

## Correct — Coverage Package Declared, Threshold Above Zero

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "4.1.5",
    "@vitest/coverage-v8": "4.1.5"
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: { lines: 9, functions: 8, branches: 6, statements: 9 },
    },
  },
});
```

Why: the normal and coverage-gated unit-test commands have stable names, `@vitest/coverage-v8` is declared alongside `vitest`, and every threshold is above `0`, so the coverage command fails the moment coverage regresses below the floor.

## Incorrect — Coverage Include Targets Test Files

```ts
// vitest.config.ts
coverage: {
  include: ["src/**/*.test.{ts,tsx}"],
},
```

Why: instrumenting only the test files themselves reports near-100% coverage no matter how little of the application's source they exercise, so the threshold measures nothing.

## Correct — Coverage Include Targets Source Files

```ts
// vitest.config.ts
coverage: {
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["**/*.test.{ts,tsx}"],
},
```

Why: instrumenting the application's source and excluding the test files themselves makes the threshold reflect how much of the application the tests actually exercise.
