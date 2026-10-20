# Husky Hook Rule

A pre-commit hook only protects a repository when its checks run and generated changes are scoped to their owners. This rule keeps staged-file checks, Vulyk-owned staging, and coverage-threshold changes accountable before each commit.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit`.
- After coverage, the hook MUST fail on unstaged `vitest.config.ts` changes so contributors explicitly review and stage them.
- The hook MUST NOT automatically stage `vitest.config.ts`.
- A repository with `vulyk.config.ts` MUST run its pinned `npx vulyk sync` and `npx vulyk agents` before `lint-staged` in `.husky/pre-commit`.
- A repository with `vulyk.config.ts` MUST run `npx vulyk stage` after `npx vulyk agents` and before `lint-staged` in `.husky/pre-commit`.
- A repository that tracks `eslint-suppressions.json` MUST declare a `lint:prune` script in package.json, run it (`npm run lint:prune`) in `.husky/pre-commit`, and then stage the suppression file.
- A repository declaring `test:requirements` MUST run it as a named script in `.husky/pre-commit`.

## Incorrect — Direct Commands Bypass Named Scripts

```sh
# .husky/pre-commit
npx lint-staged
tsc --noEmit
eslint . --prune-suppressions
vitest run --coverage
npx libyear --limit-major-individual=1
```

Why: direct commands sidestep stable package scripts, and the coverage run leaves generated configuration changes without a review gate.

## Correct — Hook Uses Named Scripts and a Coverage Guard

```sh
# .husky/pre-commit (for a repository with eslint-suppressions.json)
npx lint-staged
npm run typecheck
npm run lint:prune
git add eslint-suppressions.json
npm run test:unit:coverage

git diff --exit-code -- vitest.config.ts || exit 1

npx libyear --limit-major-individual=1
```

Why: named scripts retain a stable contract and coverage-driven threshold changes are blocked until they have been staged intentionally.

## Incorrect — Hardcoded Generated Paths

```sh
npx vulyk sync
npx vulyk agents
git add AGENTS.md CLAUDE.md docs/managed
npx lint-staged
```

Why: the hardcoded paths can miss generated outputs, including files removed after a Vulyk configuration change, and may need updating in each repository.

## Correct — Stage Only Vulyk-Owned Files

```sh
npx vulyk sync
npx vulyk agents
npx vulyk stage
npx lint-staged
```

Why: Vulyk stages only tracked managed outputs, including deletions, leaving ignored, untracked, and unrelated changes unstaged for review with `git diff --cached`. GitHub Actions runs separate verification checks under the CI Checks Rule.

## Incorrect — Coverage Changes Are Added Automatically

```sh
npm run test:unit:coverage
git add vitest.config.ts
```

Why: threshold updates can differ across platforms, so automatic staging can inadvertently commit changes made by the local coverage runner.

## Correct — Coverage Changes Stay Visible for Review

```sh
npm run test:unit:coverage

git diff --exit-code -- vitest.config.ts || exit 1
```

Why: `git diff --exit-code` displays unstaged coverage configuration changes and rejects the commit until they are reviewed and staged. Generated coverage reports remain ignored rather than committed.
