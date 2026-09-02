# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule requires the hook to run lint-staged, the typecheck, the suppression-file ratchet, the coverage-gated test suite, and the libyear drift check.

- A repository MUST configure `.husky/pre-commit` to run `lint-staged`, `npm run typecheck`, and `npx libyear --limit-major-individual=1`, with a `prepare` script that runs `husky`.
- A repository that tracks `eslint-suppressions.json` MUST prune it between the typecheck and the drift check, staging the shrink locally and failing instead on any diff when `$CI` is `true`.
- A repository that declares `vitest` and `@vitest/coverage-v8` in devDependencies MUST run the coverage-gated test suite in `.husky/pre-commit`.

## Incorrect — Hook Script Without the Checks

```sh
# .husky/pre-commit
npx prettier --check .
```

Why: none of the required checks run, so type-broken, drifting, under-tested, or newly-suppressed changes can land. `npx libyear --limit-major-individual=1` specifically is what stops a dependency from trailing the latest release by more than one major version.

## Correct — prepare Installs the Hook, the Hook Runs Every Check

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "vitest": "4.1.5",
    "@vitest/coverage-v8": "4.1.5"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
if [ -f eslint-suppressions.json ]; then
  npx eslint . --prune-suppressions
  if [ "$CI" = "true" ]; then
    git diff --exit-code eslint-suppressions.json
  else
    git add eslint-suppressions.json
  fi
fi
npx vitest run --coverage
npx libyear --limit-major-individual=1
```

Why: `prepare` installs the hook, so lint-staged, the typecheck, and the drift check run before every commit. The `eslint-suppressions.json` block prunes stale entries and stages the shrink — or fails on a diff it can't stage into, in CI — so a suppression added to hide a new violation can't land silently; the `if [ -f eslint-suppressions.json ]` guard keeps the script correct before that file exists. Declaring `vitest` and `@vitest/coverage-v8` commits the hook to the same coverage-gated run, so a regression fails at commit time instead of only in CI.
