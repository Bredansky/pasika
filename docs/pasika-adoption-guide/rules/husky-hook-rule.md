# Husky Hook Rule

A pre-commit hook only protects a repository when its checks run and generated changes stay visible to reviewers. This rule keeps staged-file checks, documentation generation, and coverage-threshold changes accountable before each commit.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit`.
- After coverage, the hook MUST fail on unstaged `vitest.config.ts` changes so contributors explicitly review and stage them.
- The hook MUST NOT automatically stage `vitest.config.ts`.
- A repository with `vulyk.config.ts` MUST run its pinned `npx vulyk sync` and `npx vulyk agents` before `lint-staged` in `.husky/pre-commit`.
- After Vulyk generation, the hook MUST fail on unstaged modifications or untracked files in `AGENTS.md`, `CLAUDE.md`, and `docs/managed`.
- The hook MUST NOT automatically stage Vulyk-generated agent or managed documentation files.
- A repository that tracks `eslint-suppressions.json` MUST declare a `lint:prune` script in package.json, run it (`npm run lint:prune`) in `.husky/pre-commit`, and then stage the suppression file.

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

if ! git diff --quiet -- vitest.config.ts; then
  echo "Vitest configuration changed. Review and stage it before committing."
  git status --short -- vitest.config.ts
  exit 1
fi

npx libyear --limit-major-individual=1
```

Why: named scripts retain a stable contract and coverage-driven threshold changes are blocked until they have been staged intentionally.

## Incorrect — Generated Vulyk Files Are Silently Staged

```sh
npx vulyk sync
npx vulyk agents
git add AGENTS.md CLAUDE.md docs/managed
npx lint-staged
```

Why: a commit can absorb updated instructions and documentation without a contributor seeing or reviewing the generated diff.

## Correct — Vulyk Changes Require Explicit Staging

```sh
npx vulyk sync
npx vulyk agents

if ! git diff --quiet -- AGENTS.md CLAUDE.md docs/AGENTS.md docs/managed ||
  [ -n "$(git ls-files --others --exclude-standard -- AGENTS.md CLAUDE.md docs/AGENTS.md docs/managed)" ]; then
  echo "Vulyk generated unstaged changes. Review and stage them before committing."
  git status --short -- AGENTS.md CLAUDE.md docs/AGENTS.md docs/managed
  exit 1
fi

npx lint-staged
```

Why: unstaged updates and new generated paths interrupt the commit while reviewed, already-staged output can proceed. Pasika also generates `docs/AGENTS.md`, so its hook includes that path. This working-tree guard does not validate partial staging, staged deletions, or customized Vulyk targets; projects with other output paths should extend its scope.

## Incorrect — Coverage Changes Are Added Automatically

```sh
npm run test:unit:coverage
git add vitest.config.ts
```

Why: threshold updates can differ across platforms, so automatic staging can inadvertently commit changes made by the local coverage runner.

## Correct — Coverage Changes Stay Visible for Review

```sh
npm run test:unit:coverage

if ! git diff --quiet -- vitest.config.ts; then
  echo "Vitest configuration changed. Review and stage it before committing."
  git status --short -- vitest.config.ts
  exit 1
fi
```

Why: the guard catches unstaged configuration changes, including those made after an earlier staging operation. Generated coverage reports remain ignored rather than being committed.
