# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule also keeps automatically pruned lint suppressions and raised coverage thresholds in the commit that earned them.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit`, then stage its auto-updated Vitest config.
- A repository that tracks `eslint-suppressions.json` MUST declare a `lint:prune` script in package.json, run it (`npm run lint:prune`) in `.husky/pre-commit`, and then stage the suppression file.

## Incorrect — Hook Calls Tools Directly Instead of Named Scripts

```json
{
  "scripts": {
    "prepare": "husky",
    "test:unit:coverage": "vitest run --coverage"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
tsc --noEmit
eslint . --prune-suppressions
vitest run --coverage
npx libyear --limit-major-individual=1
```

Why: the checks bypass their stable package-script names, and coverage can rewrite `vitest.config.ts` without adding the raised thresholds to the local commit.

## Correct — Hook Runs Named package.json Scripts

```json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit",
    "lint:prune": "eslint . --prune-suppressions",
    "test:unit:coverage": "vitest run --coverage"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npm run lint:prune
git add eslint-suppressions.json
npm run test:unit:coverage
git add vitest.config.ts
npx libyear --limit-major-individual=1
```

Why: each check's implementation lives behind one name, while the hook owns the Git-specific steps that add pruned suppressions and a threshold raised by Vitest to the commit.
