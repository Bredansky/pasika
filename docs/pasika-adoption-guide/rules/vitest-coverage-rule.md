# Vitest Coverage Rule

Coverage that measures nothing still passes. This rule requires a repository's test runner and coverage thresholds to actually gate its test run, whether or not it is a Next.js application.

- A repository MUST declare `vitest` and `@vitest/coverage-v8` in devDependencies.
- A repository MUST configure its vitest config with a coverage threshold above zero for lines, functions, branches, and statements.
- A repository MUST measure coverage of its source files, not its test files.

## Incorrect — Coverage Package Missing, Threshold Left at Zero

```json
{
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

Why: `@vitest/coverage-v8` is absent from `devDependencies`, and every threshold is `0`, so `vitest run --coverage` passes regardless of how little of the codebase the tests exercise.

## Correct — Coverage Package Declared, Threshold Above Zero

```json
{
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

Why: `@vitest/coverage-v8` is declared alongside `vitest`, and every threshold is above `0`, so `vitest run --coverage` fails the moment coverage regresses below the floor.

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
