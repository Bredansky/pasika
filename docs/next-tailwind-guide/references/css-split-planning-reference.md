# CSS Split Planning Reference

A growing `globals.css` can be split by cohesive responsibilities backed by source-module consumers and CSS symbol dependencies, not by a line-count threshold or a fixed one-file-per-directive scheme. The Global Stylesheet Rule still requires one Tailwind entry point and direct project-CSS imports.

## Using the Planner

Pasika's read-only inventory (`npx tsx scripts/css-split-plan.ts <project-root>`) uses the shared CSS dependency graph to find top-level CSS blocks, module consumers, variable/utility/keyframe links, lexical token usage counts, and candidate responsibility cohorts. Pass `--head` to analyze the committed monolith when an in-progress migration has already changed `globals.css`; `--json` produces a machine-readable report.

- The order audit includes every CSS block (including unresolved ones) in lossless source slices. It flags interleaved ownership, cross-segment CSS references, repeated definitions/selectors, and imports occurring after declarations. These are constraints, not automatic migration instructions.
- Cohorts may occupy multiple disjoint source ranges: they are **not** ready-made files, and candidate runs preserve only internal order.

Use `npx tsx scripts/css-split-plan.ts <project-root> --head --verify` to compare the committed monolith against a **virtual** source-ordered split. The verifier scans project classes with the project's installed Tailwind scanner, compiles both inputs with the same installed Tailwind compiler, and reports compiled byte equality and `@source` discovery equality. Temporary fragments are created outside the project and removed. A mismatch exits with an error status; missing Tailwind packages are not treated as a pass. `--verify` also works with `--json`.

Use `npx tsx scripts/css-split-plan.ts <project-root> --head --next` for an **isolated Next.js production/Webpack verification**. It clones committed `HEAD` into an OS temporary directory, links the target project's installed dependencies, runs two clean `next build --webpack` commands (original stylesheet then physical source-ordered CSS fragments), and compares every emitted static CSS asset by SHA-256 and total size. The cloned project and build outputs are discarded; the real worktree and its uncommitted CSS are never edited. This mode requires working project dependencies and build-time configuration; build failures are blockers, not parity passes. On Windows, Git's line-ending conversion is normalized inside the clone for comparable builds.

This is specifically **Next/Webpack**, not the project's default Turbopack build: Turbopack refuses an external `node_modules` junction outside its filesystem root. A Webpack match does not prove Turbopack asset parity; that requires a separate properly isolated Turbopack build with dependencies inside its filesystem root.

## Before Applying a Split

Before applying a split, preserve the original cascade and conditions, keep coupled declarations together where possible, and validate Tailwind's compiled CSS and application behavior. Hoisting `@import` statements can reorder originally interleaved rules.

- Review `@theme` scopes, nested `@layer`, conditional overrides, and animation/keyframe links explicitly; the planner deliberately does not modify CSS.
- Keep lexical token counts in generated reports rather than comments that go stale in source: they are approximate code references, not runtime measurements.
- Treat responsibility cohorts as hypotheses, not verified cascade-preserving file boundaries; even a matching virtual Tailwind compile does **not** prove the final PostCSS/bundler output, relative URL rewriting, or browser cascade. Verify those against a real implementation before migrating.
