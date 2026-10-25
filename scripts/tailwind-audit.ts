#!/usr/bin/env node
/**
 * Read-only Tailwind audit: npx tsx scripts/tailwind-audit.ts <repo> [--json].
 * Findings are informational and never change the target repository.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditTailwindStyles } from "./utils/tailwind-audit";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mdx", ".vue"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);

function sourceTexts(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) result.push(...sourceTexts(path.join(dir, entry.name)));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      result.push(readFileSync(path.join(dir, entry.name), "utf8"));
    }
  }
  return result;
}

/** Exported for hermetic CLI tests. Never writes to the target repository. */
export function runTailwindAudit(args: readonly string[], write: (value: string) => void): void {
  const json = args.includes("--json");
  const target = args.find((arg) => !arg.startsWith("--"));
  if (args.includes("--help")) {
    write("Usage: npm run audit:tailwind -- <repo-path> [--json]\n");
    return;
  }
  if (!target || args.some((arg) => arg.startsWith("--") && arg !== "--json")) {
    throw new Error("Usage: npm run audit:tailwind -- <repo-path> [--json]");
  }
  const root = path.resolve(target);
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Target repository does not exist: ${root}`);
  }
  const stylesheet = path.join(root, "src", "app", "styles", "globals.css");
  if (!existsSync(stylesheet)) throw new Error(`Missing src/app/styles/globals.css in ${root}`);

  const report = auditTailwindStyles(readFileSync(stylesheet, "utf8"), sourceTexts(path.join(root, "src")));
  if (json) {
    write(`${JSON.stringify({ target: root, stylesheet, ...report }, null, 2)}\n`);
    return;
  }
  write(
    `\nPasika Tailwind audit (read-only): ${root}\nUtilities: ${String(report.summary.utilities)} | Root tokens: ${String(
      report.summary.rootVariables,
    )} | Theme declarations: ${String(report.summary.themeVariables)} | One static reference: ${String(
      report.summary.singleReferenceUtilities,
    )} | Possibly unused: ${String(report.summary.possibleUnusedUtilities)}\nReview candidates: ${String(report.findings.length)}\n`,
  );
  for (const item of report.findings) {
    write(`\n[${item.kind}] ${item.names.join(", ")} (globals.css:${String(item.line)})\n  ${item.detail}\n`);
  }
  write("\nNo files modified. Findings are not lint failures.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runTailwindAudit(process.argv.slice(2), (message) => process.stdout.write(message));
  } catch (error: unknown) {
    process.stderr.write(`Tailwind audit failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
