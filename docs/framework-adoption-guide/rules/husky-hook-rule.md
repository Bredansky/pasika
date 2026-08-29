# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule requires the hook to run lint-staged, the typecheck, and the libyear drift check.

- A repository MUST configure `.husky/pre-commit` to run `lint-staged`, `npm run typecheck`, and `npx libyear --limit-major-individual=1`, with a `prepare` script that runs `husky`.

## Incorrect — Hook Script Without the Checks

```sh
# .husky/pre-commit
npx prettier --check .
```

Why: lint-staged, the typecheck, and the drift check never run, so formatted-looking but type-broken or drifting changes can land. The drift check (`npx libyear --limit-major-individual=1`) is what keeps a dependency from trailing the latest release by more than one major version.

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
npx lint-staged && npm run typecheck && npx libyear --limit-major-individual=1
```

Why: `prepare` installs the hook on `npm install`, and the hook runs the staged-file checks, the typecheck, and the dependency-drift check (`npx libyear --limit-major-individual=1`) before every commit.
