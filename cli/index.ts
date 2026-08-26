#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import {
  buildCoverageReport,
  classifyRequirement,
  readRegistry,
  writeRegistry,
  type CoverageIssue,
} from "../enforcement/coverage.js";
import { enforcementKindSchema } from "../enforcement/types.js";
import { checkDocs } from "../enforcement/docs-check.js";
import { runDoctor } from "../enforcement/doctor.js";
import { log, error, json } from "./output.js";

const REGISTRY_RELATIVE_PATH = path.join("enforcement", "registry.json");

/** Walks up from `startDir` to the directory that holds the enforcement registry. */
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

const program = new Command();

program.name("pasika").description("Applies and diagnoses the pasika framework.");

program
  .command("docs")
  .description("Check documentation against the documentation guide.")
  .option("--dir <path>", "documentation folder to check", "docs")
  .option("--json", "print findings as JSON")
  .action((options: { dir: string; json?: boolean }) => {
    const docsRoot = path.resolve(options.dir);
    if (!existsSync(docsRoot)) {
      error(`No documentation folder at ${docsRoot}`);
      process.exit(1);
    }

    const { docs, findings } = checkDocs(docsRoot);

    if (options.json) {
      json({ documents: docs.length, findings });
      process.exit(findings.length > 0 ? 1 : 0);
    }

    for (const finding of findings) {
      log(`  ✗ ${finding.doc}:${String(finding.line)}  ${finding.check}  ${finding.message}`);
    }
    log(
      findings.length === 0
        ? `\n✓ ${String(docs.length)} documents pass`
        : `\n${String(docs.length)} documents checked · ${String(findings.length)} findings`,
    );
    process.exit(findings.length > 0 ? 1 : 0);
  });

program
  .command("coverage")
  .description("Check that every documented requirement has recorded enforcement.")
  .option("--accept", "rehash reworded requirements and drop removed ones")
  .option("--classify <hash>", "record how one requirement is checked")
  .option("--kind <kind>", "enforcement kind for --classify")
  .option("--ref <id>", "rule or check id for --classify")
  .option("--note <text>", "why it is not checked, or what the check misses")
  .option("--json", "print the report as JSON")
  .action(
    (options: { accept?: boolean; classify?: string; kind?: string; ref?: string; note?: string; json?: boolean }) => {
      const root = findRegistryRoot(process.cwd());
      if (!root) {
        error(`No ${REGISTRY_RELATIVE_PATH} found in this directory or any parent.`);
        process.exit(1);
      }

      const docsRoot = path.join(root, "docs");
      if (!existsSync(docsRoot)) {
        error(`No documentation folder at ${docsRoot}. Run coverage inside the pasika repository.`);
        process.exit(1);
      }

      const registryPath = path.join(root, REGISTRY_RELATIVE_PATH);

      if (options.classify !== undefined) {
        const kind = enforcementKindSchema.safeParse(options.kind);
        if (!kind.success) {
          error(`✗ --kind must be one of ${enforcementKindSchema.options.join(", ")}.`);
          process.exit(1);
        }
        try {
          const result = classifyRequirement({
            docsRoot,
            registry: readRegistry(registryPath),
            input: { hash: options.classify, kind: kind.data, ref: options.ref, note: options.note },
          });
          writeRegistry(registryPath, result.registry);
          const change =
            result.previousKind === undefined
              ? `recorded as ${result.requirement.kind}`
              : `reclassified from ${result.previousKind} to ${result.requirement.kind}`;
          log(`✓ ${change}: ${result.requirement.text}`);
        } catch (err) {
          error(`✗ ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      }

      const report = buildCoverageReport({
        docsRoot,
        registry: readRegistry(registryPath),
        rulesDir: path.join(root, "eslint", "pasika", "rules"),
      });

      if (options.json) {
        json(report);
        process.exit(report.issues.length > 0 ? 1 : 0);
      }

      for (const issue of report.issues) {
        const where = issue.line === undefined ? issue.doc : `${issue.doc}:${String(issue.line)}`;
        log(`  ✗ ${ISSUE_LABELS[issue.kind]} ${truncate(issue.text, 76)}`);
        log(`              ${where}${issue.detail ? `\n              ${issue.detail}` : ""}`);
      }

      const { counts } = report;
      log(
        [
          "",
          `${String(report.total)} requirements · ${String(report.mechanical)} mechanically enforced`,
          `  eslint ${String(counts.eslint)} · doctor ${String(counts.doctor)} · docs-check ${String(counts["docs-check"])}`,
          `  planned ${String(counts.planned)} · judgment ${String(counts.judgment)} · permission ${String(counts.permission)}`,
          `  unclassified ${String(report.issues.filter((issue) => issue.kind === "new").length)}`,
        ].join("\n"),
      );

      if (options.accept) {
        writeRegistry(registryPath, report.nextRegistry);
        const accepted = report.issues.filter((issue) => issue.kind === "changed" || issue.kind === "removed");
        log(`\nAccepted ${String(accepted.length)} change(s) into ${REGISTRY_RELATIVE_PATH}.`);
        log("Requirements reported as new still need a classification.");
        process.exit(report.issues.some((issue) => issue.kind === "new") ? 1 : 0);
      }

      process.exit(report.issues.length > 0 ? 1 : 0);
    },
  );

program
  .command("doctor")
  .description("Diagnose gaps between the repository and the pasika framework baseline.")
  .option("--json", "print findings as JSON")
  .action((options: { json?: boolean }) => {
    const findings = runDoctor(process.cwd());

    if (options.json) {
      json({ findings });
      process.exit(findings.some((f) => f.severity === "error") ? 1 : 0);
    }

    for (const finding of findings) {
      const icon = finding.severity === "error" ? "✗" : "⚠";
      log(`  ${icon} ${finding.check}  ${finding.message}`);
    }
    log(findings.length === 0 ? "\n✓ No gaps found" : `\n${String(findings.length)} finding(s)`);
    process.exit(findings.some((f) => f.severity === "error") ? 1 : 0);
  });

program.parse();
