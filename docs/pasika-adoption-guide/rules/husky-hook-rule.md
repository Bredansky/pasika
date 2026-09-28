# Husky Hook Rule

Pre-commit hooks should protect the working tree without turning validation into a repository mutation.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and invoke it from `.husky/pre-commit`.
- A repository MUST NOT run `npm run test:unit:coverage` in `.husky/pre-commit`.
- A repository MUST NOT stage a Vitest config as a side effect of `.husky/pre-commit`.
- A repository that tracks `eslint-suppressions.json` MUST declare a `lint:prune` script in package.json, run it (`npm run lint:prune`) in `.husky/pre-commit`, and then stage the suppression file.

## Incorrect — Typecheck Tool Called Directly

```sh
# .husky/pre-commit
npx lint-staged
tsc --noEmit
npx libyear --limit-major-individual=1 --no-pre-releases
```

Why: the hook bypasses the repository's named typecheck command.

## Correct — Typecheck Runs Through package.json

```json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit"
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npx libyear --limit-major-individual=1 --no-pre-releases
```

Why: the hook calls the stable package-script interface instead of duplicating the command.

## Incorrect — Aggregate Coverage Runs During Pre-Commit

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npm run test:unit:coverage
npx libyear --limit-major-individual=1 --no-pre-releases
```

Why: aggregate coverage is expensive and unrelated to many commits, so every local commit pays the full-suite cost.

## Correct — Aggregate Coverage Runs in CI

```sh
# .husky/pre-commit
npx lint-staged
npm run typecheck
npm run test:requirements
npx libyear --limit-major-individual=1 --no-pre-releases
```

```yaml
# .github/workflows/checks.yml
- name: Run checks
  run: npm run lint && npm run typecheck && npm run test:unit:coverage && npm run test:requirements && npm run build
```

Why: commits keep deterministic lint, typecheck, and requirement checks, while pull requests get the full read-only aggregate coverage gate.

## Incorrect — Pre-Commit Stages Vitest Config

```sh
# .husky/pre-commit
npm run test:unit:coverage:update
git add vitest.config.ts
```

Why: validation mutates and stages coverage policy without an explicit coverage-maintenance change.

## Correct — Coverage Ratchet Is Explicit

```sh
npm run test:unit:coverage:update
git add vitest.config.ts
```

Why: raising thresholds is an intentional maintenance action rather than a hidden side effect of every commit.
