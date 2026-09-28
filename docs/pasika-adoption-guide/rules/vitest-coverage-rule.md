# Vitest Coverage Rule

Coverage gates should detect regressions without mutating repository state during ordinary validation.

- A repository MUST declare `vitest` and `@vitest/coverage-v8` in devDependencies.
- A repository MUST declare a `test:unit` script in package.json that runs Vitest without coverage.
- A repository MUST declare a `test:unit:coverage` script that runs Vitest with coverage and `--coverage.thresholds.autoUpdate=false`.
- A repository MUST declare a separate `test:unit:coverage:update` script that runs Vitest with coverage and `--coverage.thresholds.autoUpdate=true`.
- A repository MUST configure its Vitest config with a coverage threshold above zero for lines, functions, branches, and statements.
- A repository MUST NOT enable `coverage.thresholds.autoUpdate` in its Vitest config.
- A repository MUST measure coverage of its source files, not its test files.
- A repository MUST declare a `test:unit:staged` script in package.json that runs `vitest related` without coverage and configure lint-staged to run it (`npm run test:unit:staged --`) for staged JavaScript or TypeScript files.

## Incorrect — Coverage Package Missing

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:coverage": "vitest run --coverage --coverage.thresholds.autoUpdate=false",
    "test:unit:coverage:update": "vitest run --coverage --coverage.thresholds.autoUpdate=true"
  },
  "devDependencies": {
    "vitest": "5.0.0"
  }
}
```

Why: coverage is configured as a supported workflow, but the V8 coverage provider package is absent.

## Correct — Coverage Package Declared

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:coverage": "vitest run --coverage --coverage.thresholds.autoUpdate=false",
    "test:unit:coverage:update": "vitest run --coverage --coverage.thresholds.autoUpdate=true"
  },
  "devDependencies": {
    "vitest": "5.0.0",
    "@vitest/coverage-v8": "5.0.0"
  }
}
```

Why: Vitest and its V8 coverage provider are declared together.

## Incorrect — Coverage Threshold Left at Zero

```ts
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 0,
    functions: 0,
    branches: 0,
    statements: 0,
    autoUpdate: false,
  },
},
```

Why: zero thresholds do not gate regressions.

## Correct — Coverage Threshold Above Zero

```ts
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 92,
    functions: 96,
    branches: 82,
    statements: 88,
    autoUpdate: false,
  },
},
```

Why: ordinary coverage validation fails when measured coverage drops below the committed floor.

## Incorrect — Validation Mutates Coverage Thresholds

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage --coverage.thresholds.autoUpdate=true"
  }
}
```

Why: a validation command can rewrite the Vitest config, so checking a change can manufacture unrelated repository changes.

## Correct — Validation and Ratcheting Are Separate

```json
{
  "scripts": {
    "test:unit:coverage": "vitest run --coverage --coverage.thresholds.autoUpdate=false",
    "test:unit:coverage:update": "vitest run --coverage --coverage.thresholds.autoUpdate=true"
  }
}
```

```ts
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 92,
    functions: 96,
    branches: 82,
    statements: 88,
    autoUpdate: false,
  },
},
```

Why: normal validation is read-only, while raising the committed thresholds requires an explicit command.

## Incorrect — Coverage Include Targets Test Files

```ts
// vitest.config.ts
coverage: {
  include: ["src/**/*.test.{ts,tsx}"],
},
```

Why: instrumenting only tests can report high coverage regardless of how much application source those tests exercise.

## Correct — Coverage Include Targets Source Files

```ts
// vitest.config.ts
coverage: {
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["**/*.test.{ts,tsx}"],
},
```

Why: coverage measures application source while excluding the tests themselves.

## Incorrect — Staged Tests Collect Coverage

```json
{
  "scripts": {
    "test:unit:staged": "vitest related --run --coverage"
  }
}
```

Why: staged-file validation should select related tests, not reinterpret each presentation-only edit as a coverage change.

## Correct — Staged Files Run Related Tests Without Coverage

```json
{
  "scripts": {
    "test:unit:staged": "vitest related --run",
    "lint:staged": "eslint --fix",
    "format:staged": "prettier --write"
  },
  "lint-staged": {
    "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": ["npm run lint:staged --", "npm run test:unit:staged --"],
    "*.{css,json,md}": ["npm run lint:staged --", "npm run format:staged --"]
  }
}
```

Why: relevant tests stay fast at commit time, while aggregate coverage remains a separate read-only validation gate.
