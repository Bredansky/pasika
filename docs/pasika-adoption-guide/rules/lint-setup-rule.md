# Lint Setup Rule

Repository-wide linting and staged-file linting serve different feedback loops. This rule keeps both available without making every commit lint unchanged files.

- A repository MUST declare a `lint` script in package.json that runs ESLint across the repository.
- A repository MUST configure `lint-staged` in package.json to run ESLint directly for staged JavaScript or TypeScript files.

## Incorrect — Full Lint Missing, Staged Lint Runs It Indirectly

```json
{
  "scripts": {},
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "npm run lint"
  }
}
```

Why: no named command checks the full repository, while the staged-file task delegates to a missing script instead of passing its selected files directly to ESLint.

## Correct — Full Lint Named, Staged Lint Runs ESLint Directly

```json
{
  "scripts": {
    "lint": "eslint ."
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "eslint --fix"
  }
}
```

Why: `npm run lint` checks the full repository, while lint-staged passes only its selected JavaScript and TypeScript files to ESLint.
