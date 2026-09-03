# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule requires the hook to run lint-staged and the libyear drift check directly, and to run the typecheck, suppression-file ratchet, and coverage-gated test suite through named package.json scripts.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository that tracks `eslint-suppressions.json` MUST declare a `lint:prune` script in package.json and run it (`npm run lint:prune`) in `.husky/pre-commit`.

## Incorrect — Hook Calls Tools Directly Instead of Named Scripts

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
tsc --noEmit
eslint . --prune-suppressions
npx libyear --limit-major-individual=1
```

Why: `typecheck` and `lint:prune` are absent from package.json, so nothing names what each check does, and the hook calling tools directly can't be changed (a flag, a config path) without editing `.husky/pre-commit` itself.

## Correct — Hook Runs Named package.json Scripts

```json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit",
    "lint:prune": "eslint . --prune-suppressions"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npm run lint:prune
npx libyear --limit-major-individual=1
```

Why: each check's implementation lives behind one name, so a repository can change how `lint:prune` keeps `eslint-suppressions.json` canonical without touching the hook. `lint:prune` is required once `eslint-suppressions.json` exists, so the same three-line hook stays correct before a repository has adopted it.
