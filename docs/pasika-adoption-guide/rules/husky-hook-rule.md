# Husky Hook Rule

Checks that land before a commit only protect the repository if the hook runs them. This rule keeps automatically pruned lint suppressions in the commit while leaving platform-sensitive coverage threshold updates explicit for review.

- A repository MUST declare a `prepare` script in package.json that runs `husky`.
- A repository MUST configure `.husky/pre-commit` to run `lint-staged`.
- A repository MUST configure `.husky/pre-commit` to run `npx libyear --limit-major-individual=1`.
- A repository MUST declare a `typecheck` script in package.json and run it (`npm run typecheck`) in `.husky/pre-commit`.
- A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit`. After coverage completes, the hook MUST fail if `vitest.config.ts` has unstaged changes; contributors MUST review and explicitly stage those changes. The hook MUST NOT automatically `git add` the Vitest config.
- A repository that consumes tracked documentation through Vulyk MUST run its pinned `npx vulyk sync` and `npx vulyk agents` before `lint-staged` in `.husky/pre-commit`.
- After Vulyk generation, the hook MUST fail if generated `AGENTS.md`, `CLAUDE.md`, or `docs/managed` files have unstaged changes or newly untracked files; contributors MUST review and explicitly stage the generated output. The hook MUST NOT silently `git add` these files.
- A repository SHOULD invoke `lint-staged` with `--concurrent 1` to avoid overlapping staged-file fixers.
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
if ! git diff --quiet -- vitest.config.ts; then
  echo "Vitest configuration has unstaged changes. Review and stage them before committing."
  git status --short -- vitest.config.ts
  exit 1
fi
npx libyear --limit-major-individual=1
```

Why: each check's implementation lives behind one name. The hook stages deterministic suppression pruning, while a Vitest threshold raised on one OS remains an explicit working-tree change instead of being silently committed and potentially failing on another OS.

## Vulyk — Generated Documentation Must Be Reviewed

When the repository adopts Vulyk, put this guard before `lint-staged` in `.husky/pre-commit`:

```sh
npx vulyk sync
npx vulyk agents

if ! git diff --quiet -- AGENTS.md CLAUDE.md docs/managed ||
  [ -n "$(git ls-files --others --exclude-standard -- AGENTS.md CLAUDE.md docs/managed)" ]; then
  echo "Vulyk generated unstaged changes. Review and stage them before committing."
  git status --short -- AGENTS.md CLAUDE.md docs/managed
  exit 1
fi

npx lint-staged --concurrent 1
```

Why: commits must not silently omit newly generated tracked documentation or agent instructions. Developers explicitly review and stage generated changes before committing. This complements, rather than replaces, the existing typecheck, coverage, suppression-pruning (when applicable), and `libyear` checks.

The guard detects unstaged modifications to tracked files and untracked generated paths. It does **not** prove that a partially staged file is consistent with the index, nor does it detect every staged deletion or every output path if a repository customizes Vulyk targets. Repositories with custom agent/documentation paths MUST include them in the guard. A stronger index-to-generated-output consistency check can be added separately.

## Vitest — Coverage Configuration Must Be Reviewed

After `npm run test:unit:coverage`, the hook MUST check for unstaged modifications to the tracked Vitest configuration:

```sh
npm run test:unit:coverage

if ! git diff --quiet -- vitest.config.ts; then
  echo "Vitest configuration has unstaged changes. Review and stage them before committing."
  git status --short -- vitest.config.ts
  exit 1
fi
```

Why: coverage-threshold adjustments may vary by platform. The hook must not silently stage a config change caused by coverage or accept one that has not been reviewed. Generated reports such as `coverage/` are not part of this check and should ordinarily remain Git-ignored.

This detects unstaged changes, including changes that occur after the file was staged. It does not assert that a previously staged config update was produced by the current coverage run. Projects using a different Vitest configuration path MUST adapt the path.
