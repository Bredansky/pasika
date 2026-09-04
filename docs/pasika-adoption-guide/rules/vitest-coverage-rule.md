# Vitest Coverage Rule

Coverage that measures nothing still passes. This rule requires a repository's test runner and coverage thresholds to actually gate its test run, whether or not it is a Next.js application.

- A repository MUST declare `vitest` and `@vitest/coverage-v8` in devDependencies.
- A repository MUST declare a `test:unit` script in package.json that runs Vitest without coverage.
- A repository MUST declare a `test:unit:coverage` script in package.json that runs Vitest with coverage.
- A repository MUST configure its vitest config with a coverage threshold above zero for lines, functions, branches, and statements.
- A repository MUST measure coverage of its source files, not its test files.
- A repository MUST set `coverage.thresholds.autoUpdate` to `true` in its vitest config, so a threshold only ever rises with measured coverage and a regression fails the run instead of silently lowering it.
- A repository MUST declare a `test:unit:staged` script in package.json that runs `vitest related` without coverage and configure `lint-staged` to run it (`npm run test:unit:staged --`) for staged JavaScript or TypeScript files.

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

## Incorrect — Staged Tests Run Per-File Coverage

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:coverage:staged": "vitest related --run --coverage --coverage.changed --coverage.thresholds.perFile --coverage.thresholds.lines=80 --coverage.thresholds.functions=80 --coverage.thresholds.branches=80 --coverage.thresholds.statements=80 --coverage.thresholds.autoUpdate=false"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "npm run test:unit:coverage:staged --"
  }
}
```

Why: Vitest's changed per-file coverage measures each entire changed file, not only its changed behavior. A class-name-only refactor therefore fails unless every touched presentational component already has 80% behavioral coverage, duplicating the aggregate coverage gate without measuring the styling regression.

## Correct — Staged Files Run Related Tests Without Coverage

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage",
    "test:unit:staged": "vitest related --run",
    "lint:staged": "eslint --fix"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["npm run lint:staged --", "npm run test:unit:staged --"]
  }
}
```

```ts
// vitest.config.ts
coverage: {
  thresholds: { lines: 9, functions: 8, branches: 6, statements: 9, autoUpdate: true },
},
```

Why: `lint-staged` passes staged paths to `vitest related`, so relevant tests fail quickly without interpreting presentation-only edits as uncovered behavior. The separate `test:unit:coverage` command remains the aggregate coverage authority and ratchets its thresholds upward with `autoUpdate`.
