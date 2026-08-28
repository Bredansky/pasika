# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule requires the husky pre-commit hook to run lint-staged and the typecheck.

- A repository MUST configure `.husky/pre-commit` to run `lint-staged` and `npm run typecheck`, with a `prepare` script that runs `husky`.

## Incorrect — Hook Script Without the Checks

```sh
# .husky/pre-commit
npx prettier --check .
```

Why: lint-staged and the typecheck never run, so formatted-looking but type-broken changes can land.

## Correct — prepare Installs the Hook, the Hook Runs the Checks

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged && npm run typecheck
```

Why: `prepare` installs the hook on `npm install`, and the hook runs the staged-file checks and the typecheck before every commit.
