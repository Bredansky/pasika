# CSS Split Planning Reference

A growing `globals.css` can be split by cohesive responsibilities backed by source-module consumers and CSS symbol dependencies, not by a line-count threshold or a fixed one-file-per-directive scheme. The Global Stylesheet Rule still requires one Tailwind entry point and direct project-CSS imports.

## Using the Planner

Pasika's read-only inventory (`npx tsx scripts/css-split-plan.ts <project-root>`) uses the shared CSS dependency graph to find top-level CSS blocks, module consumers, variable/utility/keyframe links, lexical token usage counts, and candidate responsibility cohorts. Pass `--head` to analyze the committed monolith when an in-progress migration has already changed `globals.css`; `--json` produces a machine-readable report.

- Cohorts may occupy multiple disjoint source ranges: they are **not** ready-made files, and candidate runs preserve only internal order.

## Before Applying a Split

Before applying a split, preserve the original cascade and conditions, keep coupled declarations together where possible, and validate Tailwind's compiled CSS and application behavior. Hoisting `@import` statements can reorder originally interleaved rules.

- Review `@theme` scopes, nested `@layer`, conditional overrides, and animation/keyframe links explicitly; the planner deliberately does not modify CSS.
- Keep lexical token counts in generated reports rather than comments that go stale in source: they are approximate code references, not runtime measurements.
- Treat responsibility cohorts as hypotheses, not verified cascade-preserving file boundaries; prove equivalent Tailwind output and application behavior before a physical migration.
