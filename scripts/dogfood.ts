#!/usr/bin/env node
/**
 * Pasika dogfood harness.
 *
 * Runs a pasika app preset from this repo's built dist against an arbitrary
 * target repository, without modifying the target. It exists to find flaws in
 * pasika itself by linting sibling repos — not to fix them.
 *
 * Usage:
 *   npm run build
 *   npx tsx scripts/dogfood.ts <path/to/target-repo> [options]
 *
 * Options:
 *   --preset <name>     pasikaNextjsApp (default) or pasikaApp
 *   --pasika-only       tally only pasika/* rules, skip the framework rules
 *   --rule <name>       tally a single rule (bare name or pasika/<name>)
 *   --findings          print every finding with its file and line
 *   --json              print the full report as JSON
 *
 * The exit code is 0 when the run itself succeeds — the target's problem
 * count is informational (printed as "Exit code would be").
 */
import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ESLint } from "eslint";
import { log, logError } from "./utils/logger";

const PRESETS = ["pasikaNextjsApp", "pasikaApp"] as const;
type PresetName = (typeof PRESETS)[number];

interface Flags {
  preset: PresetName;
  pasikaOnly: boolean;
  rule?: string;
  findings: boolean;
  json: boolean;
}

interface Finding {
  file: string;
  rule: string;
  line: number;
  message: string;
}

interface Report {
  target: string;
  preset: PresetName;
  filesLinted: number;
  total: number;
  /** Rule id → count, sorted descending. */
  tally: [rule: string, count: number][];
  findings: Finding[];
  exitCode: number;
}

/** Parse argv manually (avoids a commander dependency), matching coverage.ts. */
function parseArgs(argv: string[]): { target?: string; flags: Flags } {
  const flags: Flags = { preset: "pasikaNextjsApp", pasikaOnly: false, findings: false, json: false };
  let target: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);
    const value = (): string | undefined => inline ?? argv[++i];

    switch (name) {
      case "--preset": {
        const preset = value();
        if (preset !== "pasikaNextjsApp" && preset !== "pasikaApp") {
          throw new Error(`--preset must be one of ${PRESETS.join(", ")} (got "${preset ?? ""}")`);
        }
        flags.preset = preset;
        break;
      }
      case "--pasika-only":
        flags.pasikaOnly = true;
        break;
      case "--rule":
        flags.rule = value();
        break;
      case "--findings":
        flags.findings = true;
        break;
      case "--json":
        flags.json = true;
        break;
      default:
        if (name.startsWith("-")) throw new Error(`Unknown flag "${name}"`);
        if (target !== undefined) throw new Error(`Unexpected argument "${arg}" (target already "${target}")`);
        target = arg;
    }
  }

  return { target, flags };
}

function printUsage(): void {
  logError(
    "Usage: npx tsx scripts/dogfood.ts <path/to/target-repo> [--preset=pasikaNextjsApp|pasikaApp] [--pasika-only] [--rule=<name>] [--findings] [--json]",
  );
}

async function main(): Promise<void> {
  const { target, flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    printUsage();
    process.exit(2);
  }

  const targetRoot = path.resolve(target);
  if (!statSync(targetRoot, { throwIfNoEntry: false })?.isDirectory()) {
    logError(`Target is not a directory: ${targetRoot}`);
    process.exit(2);
  }

  // Import pasika's built preset from this repo, exactly like a standalone
  // consumer would. A stale build silently lints old rules, so require one.
  const pasikaRoot = path.resolve(new URL("..", import.meta.url).pathname);
  const distEntry = path.join(pasikaRoot, "dist", "eslint", "pasika", "index.js");
  if (!existsSync(distEntry)) {
    logError(`No built preset at ${distEntry}. Run npm run build first.`);
    process.exit(1);
  }

  // The relative globs (`src/**`) in the preset blocks resolve against the
  // current working directory, so lint from inside the target.
  process.chdir(targetRoot);

  // A dedicated config file that replaces (not merges into) the target's own
  // eslint config, importing pasika's built preset from this repo.
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "pasika-dogfood-"));
  const configFile = path.join(tmpDir, "eslint.config.mjs");
  const configSource = `import { ${flags.preset} } from ${JSON.stringify(`file://${distEntry}`)};
export default ${flags.preset};\n`;
  writeFileSync(configFile, configSource);

  const eslint = new ESLint({
    cwd: targetRoot,
    overrideConfigFile: configFile,
    // Never touch the target repo.
    fix: false,
    cache: false,
  });
  const results = await eslint.lintFiles(["."]);

  const tally = new Map<string, number>();
  const findings: Finding[] = [];
  for (const result of results) {
    for (const message of result.messages) {
      const rule = message.ruleId ?? "(fatal)";
      if (flags.pasikaOnly && !rule.startsWith("pasika/")) continue;
      // Accept the rule by its bare name (unknown-utility) or full id (pasika/unknown-utility).
      if (flags.rule !== undefined && rule !== `pasika/${flags.rule}` && rule !== flags.rule) continue;
      tally.set(rule, (tally.get(rule) ?? 0) + 1);
      findings.push({
        file: path.relative(targetRoot, result.filePath),
        rule,
        line: message.line,
        message: message.message,
      });
    }
  }

  const report: Report = {
    target: targetRoot,
    preset: flags.preset,
    filesLinted: results.length,
    total: findings.length,
    tally: [...tally.entries()].sort((a, b) => b[1] - a[1]),
    findings: findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    exitCode: findings.length > 0 ? 1 : 0,
  };

  if (flags.json) {
    log(JSON.stringify(report, undefined, 2));
    process.exit(0);
  }

  log(`\n=== pasika dogfood: ${report.target} (preset: ${report.preset}) ===`);
  log(`Files linted: ${String(report.filesLinted)}`);
  log(`Total problems: ${String(report.total)}`);

  for (const [rule, count] of report.tally) {
    log(`${String(count).padStart(4)}  ${rule}`);
  }

  if (flags.findings) {
    log("\n--- findings ---");
    for (const finding of report.findings) {
      log(`${finding.file}:${String(finding.line)}: ${finding.message}`);
    }
  }

  log(`\nExit code would be: ${String(report.exitCode)}`);
}

main().catch((error: unknown) => {
  logError(`Dogfood run failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
