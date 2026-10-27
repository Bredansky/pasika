#!/usr/bin/env node
/**
 * Read-only CSS split inventory for a Next.js application.
 *
 * Usage: npx tsx scripts/css-split-plan.ts <project-root> [--head] [--json]
 * No files in the target repository are modified.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildCssDependencyGraph } from "../eslint/rules/tailwind/css-dependency-graph";
import { planCssSplit } from "../eslint/rules/tailwind/css-split-plan";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, findFiles } from "../eslint/rules/tailwind/source-files";

const [, , target, ...flags] = process.argv;
if (!target || flags.some((flag) => flag !== "--head" && flag !== "--json")) {
  process.stderr.write("Usage: npx tsx scripts/css-split-plan.ts <project-root> [--head] [--json]\n");
  process.exit(2);
}

const root = path.resolve(target);
const sourceRoot = path.join(root, "src");
const cssPath = path.join(sourceRoot, "app", "styles", "globals.css");
const content = flags.includes("--head")
  ? execFileSync("git", ["show", "HEAD:src/app/styles/globals.css"], { cwd: root, encoding: "utf8" })
  : readFileSync(cssPath, "utf8");
// --head compares the committed monolith, not dirty untracked split partials.
const css = flags.includes("--head")
  ? [{ path: cssPath, content }]
  : findFiles(sourceRoot, CSS_EXTENSIONS).map((file) => ({ path: file, content: readFileSync(file, "utf8") }));
const modules = findFiles(sourceRoot, MODULE_EXTENSIONS).map((file) => ({
  path: file,
  content: readFileSync(file, "utf8"),
}));
const graph = buildCssDependencyGraph({ css, modules, sourceRoot });
const plan = planCssSplit({ cssPath, content, sourceRoot, graph });

if (flags.includes("--json")) {
  process.stdout.write(`${JSON.stringify(plan, undefined, 2)}\n`);
} else {
  const relationshipCount = plan.blocks.reduce((sum, block) => sum + block.dependencies.length, 0);
  process.stdout.write(
    `CSS split advisory for ${cssPath}\n` +
      `Top-level blocks: ${String(plan.blocks.length)}\n` +
      `CSS block relationships: ${String(relationshipCount)}\n` +
      `Unresolved ownership: ${String(plan.unresolvedBlocks)}\n` +
      `Contiguous owned runs: ${String(plan.runs.length)}\n\n`,
  );
  process.stdout.write("Logical responsibility cohorts (one cohort may span multiple runs):\n");
  for (const cohort of plan.cohorts) {
    process.stdout.write(
      `  ${String(cohort.blockIds.length).padStart(3)} blocks / ${String(cohort.contiguousRuns).padStart(
        2,
      )} runs / ${String(cohort.externalDependencies).padStart(2)} external links  ${cohort.ownership}\n`,
    );
  }
  process.stdout.write("\nOrdered candidate runs:\n");
  for (const run of plan.runs) {
    process.stdout.write(
      `  ${String(run.startLine).padStart(4)}-${String(run.endLine).padEnd(4)} ${run.ownership} (${String(
        run.blockIds.length,
      )} blocks)\n`,
    );
  }
  process.stdout.write("\nTop tokens by lexical module matches (not runtime usage):\n");
  for (const token of plan.tokens.slice(0, 20)) {
    process.stdout.write(
      `  ${String(token.moduleSites).padStart(5)} module / ${String(token.cssSites).padStart(4)} CSS / ${String(
        token.files,
      ).padStart(3)} files  ${token.name}\n`,
    );
  }
  process.stdout.write(
    "\nThis is NOT a safe-to-apply codemod. Keep the original source order," +
      " review conditional rules and nested layers, and compare compiled CSS before migration.\n",
  );
}
