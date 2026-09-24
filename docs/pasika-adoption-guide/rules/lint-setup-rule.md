# Lint Setup Rule

Repository-wide linting and staged-file linting serve different feedback loops. This rule keeps both available for ESLint and prettier without making every commit lint or format unchanged files.

- A repository MUST declare a `lint` script in package.json that runs ESLint across the repository.
- A repository MUST declare a `format` script in package.json that runs `prettier --check` across the repository.
- A repository MUST declare a `lint:staged` script in package.json that runs ESLint with no repository-wide argument, and configure `lint-staged` to run it (`npm run lint:staged --`) for staged JavaScript, TypeScript, CSS, Markdown, and JSON files.
- A repository MUST declare a `format:staged` script in package.json that runs prettier with no repository-wide argument, and configure `lint-staged` to run it (`npm run format:staged --`) for staged CSS, Markdown, and JSON files.

## Incorrect — Staged Checks Reuse the Repository-Wide Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "lint-staged": {
    "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint --",
    "*.{css,json,md}": ["npm run lint --", "npm run format --"]
  }
}
```

Why: `npm run lint --` and `npm run format --` append the staged file paths after the `.` already inside `lint` and `format`, and `.` already covers everything — so every commit lints and formats the whole repository instead of just what changed, the same cost `lint-staged` exists to avoid.

## Correct — Staged Checks Have Their Own Argument-Free Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:staged": "eslint --fix",
    "format": "prettier --check .",
    "format:staged": "prettier --write"
  },
  "lint-staged": {
    "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint:staged --",
    "*.{css,json,md}": ["npm run lint:staged --", "npm run format:staged --"]
  }
}
```

Why: `lint:staged` and `format:staged` carry no repository-wide argument of their own, so the file paths `lint-staged` appends after `--` become the actual and only target — `npm run lint` and `npm run format` stay free to check the whole repository for CI.
