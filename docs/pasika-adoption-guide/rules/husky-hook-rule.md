# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule keeps automatically pruned lint suppressions in the commit while leaving platform-sensitive coverage threshold updates explicit for review.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit` and MUST NOT auto-stage the Vitest config that coverage may update.
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

Why: the checks bypass their stable package-script names, and a platform-specific coverage result must not be silently added to the commit.

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
npm run test:requirements
npm run test:unit:coverage
npx libyear --limit-major-individual=1
```

Why: each check's implementation lives behind one name. The hook stages deterministic suppression pruning, while a Vitest threshold raised on one OS remains an explicit working-tree change instead of being silently committed and potentially failing on another OS.
