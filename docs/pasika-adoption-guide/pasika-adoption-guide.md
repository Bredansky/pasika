# Pasika Adoption Guide

This guide covers how a repository adopts the framework, whether it is a Next.js application or a plain TypeScript repository. An existing project may adopt it gradually by suppressing the ESLint rules it is not ready for yet, rather than migrating everything at once.

## How To Adopt the Framework in a Repository

1. Read the [Glossary Reference](references/glossary-reference.md) so you can tell a tracked doc from a managed file or an agent file before a workflow names one.
2. Read the [Tech Stack Reference](references/tech-stack-reference.md) so you know which packages the framework requires and what each one is responsible for.
3. Declare the toolchain packages — `typescript`, `eslint`, `prettier`, `husky`, `lint-staged`, and `zirka` — in `devDependencies`, each pinned to an exact version per the [Dependency Version Rule](rules/dependency-version-rule.md) so the manifest stays current without drifting.
4. If the repository is a Next.js application, declare the framework stack in package.json per the [Next.js Stack Rule](rules/next-js-stack-rule.md) so the runtime packages land in `dependencies` and the toolchain packages in `devDependencies`.
5. If the repository is a Next.js application, define the `cn` helper per the [cn Helper Rule](rules/cn-helper-rule.md) so conflicting Tailwind utilities resolve predictably.
6. Import the lint, format, and TypeScript configuration from `zirka` per the [Zirka Baseline Rule](rules/zirka-baseline-rule.md) so the framework's rules run without restating them locally.
7. Configure repository-wide and staged-file linting per the [Lint Setup Rule](rules/lint-setup-rule.md) so `npm run lint` checks the full repository while lint-staged passes only changed source files to ESLint.
8. Configure the git hook per the [Husky Hook Rule](rules/husky-hook-rule.md) so the staged-file, typecheck, suppression-ratchet, coverage-gated test, and drift checks run before every commit.
9. Declare and configure the test runner per the [Vitest Coverage Rule](rules/vitest-coverage-rule.md) so the unit-test scripts, coverage packages, and thresholds actually gate the test run.
10. Run `npx vulyk@latest init`, `npx vulyk@latest add`, and `npx vulyk@latest agents` per the [Vulyk Docs Rule](rules/vulyk-docs-rule.md) so the repository's `vulyk.config.ts` tracks the framework's docs from `pasika` and the agent files that route to them are generated.
11. Run `npm run lint -- --fix --suppress-all` so fixable violations are fixed and the remaining ones are suppressed until the repository is ready for them, keeping every rule enforced for new code.

## How To Update a Repository to the Latest Framework Release

1. Bump the framework packages within one major version per the [Dependency Version Rule](rules/dependency-version-rule.md) so the manifest stays current without drifting past the latest release.
2. Run `npx vulyk@latest sync` and then `npx vulyk@latest agents` so every tracked doc, managed file, and agent file is updated from its pinned source.
3. Run `npm run lint -- --fix --suppress-all` to list the violations the new and changed rules report, so the fixable ones are fixed and the rest are suppressed until the repository is ready for them.
