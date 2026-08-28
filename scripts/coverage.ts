#!/usr/bin/env node
/**
 * Standalone coverage script — replaces `pasika coverage`.
 *
 * Usage:
 *   npx tsx scripts/coverage.ts                  # print report
 *   npx tsx scripts/coverage.ts --accept         # accept changes
 *   npx tsx scripts/coverage.ts --json           # JSON output
 *   npx tsx scripts/coverage.ts --classify <hash> --ref <id> --note <text>
 */
import { existsSync } from "node:fs";
import path from "node:path";
/* eslint-disable no-console -- coverage-script-reports-to-terminal */

import { buildCoverageReport, type CoverageIssue } from "../utils/coverage-report";
import { classifyRequirement } from "../utils/classify";
import { readRegistry, writeRegistry } from "../utils/registry";

const REGISTRY_RELATIVE_PATH = path.join("scripts", "registry.json");

function findRegistryRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(dir, REGISTRY_RELATIVE_PATH))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const ISSUE_LABELS: Record<CoverageIssue["kind"], string> = {
  new: "new       ",
  changed: "changed   ",
  removed: "removed   ",
  "unknown-ref": "bad ref   ",
  "missing-test": "no test   ",
};

function truncate(text: string, width: number): string {
  return text.length <= width ? text : `${text.slice(0, width - 1)}…`;
}

// Parse argv manually (avoids commander dependency)
const args = process.argv.slice(2);
const flags = new Map<string, string>();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--accept") flags.set("accept", "true");
  else if (args[i] === "--json") flags.set("json", "true");
  else if (args[i] === "--classify" && args[i + 1]) flags.set("classify", String(args[++i]));
  else if (args[i] === "--ref" && args[i + 1]) flags.set("ref", String(args[++i]));
  else if (args[i] === "--note" && args[i + 1]) flags.set("note", String(args[++i]));
}

const root = findRegistryRoot(process.cwd());
if (!root) {
  console.error(`No ${REGISTRY_RELATIVE_PATH} found in this directory or any parent.`);
  process.exit(1);
}

const docsRoot = path.join(root, "docs");
if (!existsSync(docsRoot)) {
  console.error(`No documentation folder at ${docsRoot}. Run coverage inside the pasika repository.`);
  process.exit(1);
}

const registryPath = path.join(root, REGISTRY_RELATIVE_PATH);

const classifyHash = flags.get("classify");
if (classifyHash !== undefined) {
  try {
    const result = classifyRequirement({
      docsRoot,
      registry: readRegistry(registryPath),
      input: {
        hash: classifyHash,
        ref: flags.get("ref"),
        note: flags.get("note"),
      },
    });
    writeRegistry(registryPath, result.registry, docsRoot);
    const check = result.requirement.ref ? `governed by ${result.requirement.ref}` : "applied by judgment";
    console.log(`✓ recorded as ${check}: ${result.requirement.text}`);
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

const report = buildCoverageReport({
  docsRoot,
  registry: readRegistry(registryPath),
  rulesDir: path.join(root, "eslint", "pasika", "rules"),
});

if (flags.has("json")) {
  console.log(JSON.stringify(report, undefined, 2));
  process.exit(report.issues.length > 0 ? 1 : 0);
}

for (const issue of report.issues) {
  const where = issue.line === undefined ? issue.doc : `${issue.doc}:${String(issue.line)}`;
  console.log(`  ✗ ${ISSUE_LABELS[issue.kind]} ${truncate(issue.text, 76)}`);
  console.log(`              ${where}${issue.detail ? `\n              ${issue.detail}` : ""}`);
}

console.log(
  [
    "",
    `${String(report.total)} requirements`,
    `  governed by a rule or check ${String(report.governed)} · by judgment ${String(report.judgment)}`,
    `  unclassified ${String(report.issues.filter((issue) => issue.kind === "new").length)}`,
  ].join("\n"),
);

if (flags.has("accept")) {
  writeRegistry(registryPath, report.nextRegistry, docsRoot);
  const accepted = report.issues.filter((issue) => issue.kind === "changed" || issue.kind === "removed");
  console.log(`\nAccepted ${String(accepted.length)} change(s) into ${REGISTRY_RELATIVE_PATH}.`);
  console.log("Requirements reported as new still need a classification.");
  process.exit(report.issues.some((issue) => issue.kind === "new") ? 1 : 0);
}

process.exit(report.issues.length > 0 ? 1 : 0);

/* eslint-enable no-console -- re-enable after coverage script output block */
