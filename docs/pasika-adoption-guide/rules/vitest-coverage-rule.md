# Vitest Coverage Rule

Coverage that measures nothing still passes. This rule requires a repository's test runner and coverage thresholds to actually gate its test run, whether or not it is a Next.js application.

- A repository MUST declare `vitest` and `@vitest/coverage-v8` in devDependencies.
- A repository MUST declare a `test:unit` script in package.json that runs Vitest without coverage.
- A repository MUST declare a `test:unit:coverage` script in package.json that runs Vitest with coverage.
- A repository MUST configure its vitest config with a coverage threshold above zero for lines, functions, branches, and statements.
- A repository MUST measure coverage of its source files, not its test files.
- A repository MUST set `coverage.thresholds.autoUpdate` to `true` in its vitest config, so a threshold only ever rises with measured coverage and a regression fails the run instead of silently lowering it.
- A repository MUST declare a `test:unit:coverage:staged` script in package.json that runs `vitest related` with coverage, configure `lint-staged` to run it (`npm run test:unit:coverage:staged --`) for staged JavaScript or TypeScript files, and set `coverage.changed` to `true` with a `coverage.thresholds.perFile` of at least `80` for lines, functions, branches, and statements, so new or modified files are gated individually while the whole-repository aggregate stays a CI-only concern.

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

## Incorrect — Staged-Files Check Runs the Whole Suite, Not Wired to Staged Files

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:coverage:staged": "vitest run --coverage"
  }
}
```

Why: `vitest run` executes every test file regardless of what's staged, so the staged-files script costs as much as the full aggregate for a fraction of the value — and with no `lint-staged` entry calling it, nothing runs it before a commit anyway.

## Correct — vitest related Scoped to Staged Files via lint-staged

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:coverage:staged": "vitest related --run --coverage",
    "lint:staged": "eslint --fix"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["npm run lint:staged --", "npm run test:unit:coverage:staged --"]
  }
}
```

```ts
// vitest.config.ts
coverage: {
  changed: true,
  thresholds: {
    lines: 9,
    functions: 8,
    branches: 6,
    statements: 9,
    autoUpdate: true,
    perFile: { lines: 80, functions: 80, branches: 80, statements: 80 },
  },
},
```

Why: `autoUpdate` raises the stored thresholds as coverage improves and fails the run if it ever drops, so the floor only rises. `lint-staged` passes the staged files to both scripts, so `vitest related` only runs their tests and `coverage.changed` scopes the report to them, letting `perFile`'s 80% floor gate each one — a new or modified file can't land undertested behind a passing aggregate.
