/**
 * Major-version drift check.
 *
 * Reads package.json dependencies and devDependencies, queries the npm registry
 * for each package's latest version, and fails when any package is behind the
 * latest release by one or more major versions. Scoped to the packages listed
 * in package.json (all of them).
 *
 * Usage: npm run check-drift   (or npx tsx scripts/check-drift.ts)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";
/* eslint-disable no-console -- drift-check-reports-to-terminal */

const manifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

/**
 * Packages whose latest major is not adoptable yet, with the reason. The check
 * skips them so the repo can stay on a supported major without failing.
 */
const BLOCKED_MAJORS: Readonly<Record<string, string>> = {
  typescript:
    "@typescript-eslint/parser peer-dep caps TypeScript at <6.1.0; TS 7 is not adoptable until the lint toolchain drops the cap",
};

function majorOf(version: string): number | null {
  const matched = /^[^\d]*(?<major>\d+)/.exec(version);
  return matched ? Number(matched.groups?.major) : null;
}

function fetchLatest(packageName: string): string {
  return execSync(`npm view ${packageName} version 2>/dev/null`, { encoding: "utf8" }).trim();
}

function main(): void {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync("package.json", "utf8")));

  const declared = { ...parsed.dependencies, ...parsed.devDependencies };
  const drifted: string[] = [];

  for (const [name, range] of Object.entries(declared)) {
    const declaredMajor = majorOf(range);
    if (declaredMajor === null) continue;
    let latestMajor: number | null;
    try {
      latestMajor = majorOf(fetchLatest(name));
    } catch {
      continue; // package not found on registry (e.g. private/git)
    }
    if (latestMajor !== null && latestMajor > declaredMajor && !(name in BLOCKED_MAJORS)) {
      drifted.push(`${name}: declared major ${String(declaredMajor)}, latest major ${String(latestMajor)}`);
    }
  }

  if (drifted.length > 0) {
    console.error(`Major version drift detected:\n${drifted.map((line) => `  - ${line}`).join("\n")}`);
    process.exit(1);
  }
  console.log("✓ All dependencies are within the current major version.");
}

main();

/* eslint-enable no-console -- re-enable after drift-check block */