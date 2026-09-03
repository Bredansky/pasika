# Lint Setup Rule

Repository-wide linting and staged-file linting serve different feedback loops. This rule keeps both available for ESLint and prettier without making every commit lint or format unchanged files.

- A repository MUST declare a `lint` script in package.json that runs ESLint across the repository.
- A repository MUST declare a `format` script in package.json that runs `prettier --check` across the repository.
- A repository MUST configure `lint-staged` in package.json to run ESLint directly for staged JavaScript or TypeScript files.
- A repository MUST configure `lint-staged` in package.json to run prettier for staged files ESLint does not already format.

## Incorrect — Full Checks Missing, Staged Lint Runs ESLint Indirectly

```json
{
  "scripts": {},
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "npm run lint"
  }
}
```

Why: no named command checks the full repository for lint or format violations, the staged-file task delegates to a missing script instead of passing its selected files directly to ESLint, and nothing formats the files ESLint's JS/TS glob does not match.

## Correct — Full Checks Named, Staged Checks Run Directly

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "eslint --fix",
    "*.{css,md,json}": "prettier --write"
  }
}
```

Why: `npm run lint` and `npm run format` check the full repository, while lint-staged passes only its selected files to ESLint or prettier directly. ESLint already enforces prettier's formatting on the JS/TS files it lints — zirka bundles prettier as an ESLint plugin — so prettier's own `lint-staged` entry only needs to cover the files ESLint's glob does not match.
