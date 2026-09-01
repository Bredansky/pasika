# Next.js Stack Rule

A repository that adopts the framework installs its packages through package.json. This rule requires the packages it names below to be declared in the section each belongs to.

- A repository adopting the framework MUST list `next`, `react`, `react-dom`, `zod`, `class-variance-authority`, `clsx`, and `tailwind-merge` as a dependency in package.json.
- A repository adopting the framework MUST list `typescript`, `tailwindcss`, `eslint`, `prettier`, `husky`, `lint-staged`, and `zirka` as a devDependency in package.json.

## Incorrect — Stack Package Missing From the Manifest

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3"
  }
}
```

Why: `react-dom`, `zod`, `class-variance-authority`, `clsx`, and `tailwind-merge` are absent from `dependencies`, so the app cannot render in the browser or resolve conflicting utilities. The manifest has no `devDependencies` section at all, so `typescript`, `tailwindcss`, `eslint`, `prettier`, `husky`, `lint-staged`, and `zirka` are absent too.

## Correct — Every Stack Package Declared in Its Section

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "zod": "4.4.3",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "3.4.0"
  },
  "devDependencies": {
    "typescript": "6.0.3",
    "tailwindcss": "4.1.0",
    "eslint": "10.9.1",
    "prettier": "3.8.1",
    "husky": "9.1.7",
    "lint-staged": "17.4.1",
    "zirka": "0.0.47"
  }
}
```

Why: every package the rule names resolves in the section it belongs to, so the framework's rules and configuration apply as written.
