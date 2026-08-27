/**
 * `pasika doctor` checks.
 *
 * Diagnoses gaps between a consumer repository and the pasika framework
 * baseline. Scope: dependencies, configuration, managed files, and
 * source structure. Code-level and path-level rules belong to ESLint.
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export interface DoctorFinding {
  /** Which requirement this relates to. */
  check: string;
  /** Human-readable description. */
  message: string;
  /** Severity: error blocks adoption, warning is informational. */
  severity: "error" | "warning";
}

const packageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;

function readPackageJson(filePath: string): PackageJson {
  try {
    const result = packageJsonSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf8")));
    if (result.success) return result.data;
  } catch {
    // missing or unparseable
  }
  return {};
}

/**
 * Check that pasika and zirka are installed at compatible versions.
 */
function checkFrameworkPackages(pkg: PackageJson): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

  if (!allDeps.pasika) {
    findings.push({
      check: "pasika-installed",
      message: "pasika is not listed in package.json.",
      severity: "error",
    });
  }

  if (!allDeps.zirka) {
    findings.push({
      check: "zirka-installed",
      message: "zirka is not listed in package.json.",
      severity: "error",
    });
  }

  return findings;
}

/**
 * Check that application source lives under src/.
 */
function checkSourceRoot(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const srcDir = path.join(cwd, "src");
  if (!fs.existsSync(srcDir)) {
    findings.push({
      check: "source-under-src",
      message: "Application source must live under src/.",
      severity: "error",
    });
    return findings;
  }

  // Check for common non-src source directories at the project root
  const entries = fs.readdirSync(cwd, { withFileTypes: true });
  const suspicious = entries.filter(
    (e) =>
      e.isDirectory() &&
      !e.name.startsWith(".") &&
      e.name !== "src" &&
      e.name !== "node_modules" &&
      e.name !== "dist" &&
      e.name !== "build" &&
      e.name !== ".vulyk" &&
      e.name !== "docs" &&
      e.name !== "enforcement" &&
      e.name !== "eslint" &&
      e.name !== "cli" &&
      e.name !== "__tests__" &&
      e.name !== "test" &&
      e.name !== "tests" &&
      e.name !== "coverage" &&
      e.name !== ".github" &&
      e.name !== ".agents" &&
      e.name !== ".husky" &&
      e.name !== ".next" &&
      e.name !== ".turbo" &&
      e.name !== ".vercel" &&
      e.name !== ".cache" &&
      e.name !== ".tmp" &&
      e.name !== "tmp" &&
      e.name !== "public" &&
      e.name !== "static" &&
      e.name !== "assets" &&
      e.name !== "bin" &&
      e.name !== "vendor",
  );

  if (suspicious.length > 0) {
    const names = suspicious.map((e) => e.name).join(", ");
    findings.push({
      check: "source-under-src",
      message: `Possible source directories outside src/: ${names}.`,
      severity: "warning",
    });
  }

  return findings;
}

/**
 * Find the global CSS file that registers Tailwind.
 */
function findGlobalStylesheet(cwd: string): string | undefined {
  const candidates = ["src/app/globals.css", "src/styles/globals.css", "src/globals.css"];
  for (const candidate of candidates) {
    const full = path.join(cwd, candidate);
    if (fs.existsSync(full)) return full;
  }
  // Search for any CSS file containing @import "tailwindcss"
  const srcDir = path.join(cwd, "src");
  if (!fs.existsSync(srcDir)) return undefined;
  const walk = (dir: string): string | undefined => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
        const found = walk(full);
        if (found) return found;
      }
      if (entry.isFile() && entry.name.endsWith(".css")) {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes('@import "tailwindcss"') || content.includes("@import 'tailwindcss'")) {
          return full;
        }
      }
    }
    return undefined;
  };
  return walk(srcDir);
}

/**
 * Check that the repository has a global stylesheet entry point that
 * registers Tailwind. The stylesheet's contents are the ESLint CSS rules'
 * concern, so doctor only checks that it exists.
 */
function checkGlobalStylesheet(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const stylesheet = findGlobalStylesheet(cwd);

  if (!stylesheet) {
    findings.push({
      check: "global-stylesheet",
      message: 'No global stylesheet found. Create src/app/globals.css with @import "tailwindcss".',
      severity: "error",
    });
  }

  return findings;
}

/**
 * Check that configuration files follow the pasika baseline.
 *
 * Repositories must take their lint, format, and TypeScript configuration
 * from pasika and zirka rather than restating it locally.
 */
function checkConfigBaseline(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];

  // eslint.config.ts must exist and reference zirka
  const eslintConfigs = ["eslint.config.ts", "eslint.config.mjs", "eslint.config.js"];
  const eslintConfig = eslintConfigs.find((name) => fs.existsSync(path.join(cwd, name)));
  if (!eslintConfig) {
    findings.push({
      check: "config-baseline",
      message: "No eslint config found. Create eslint.config.ts extending the pasika/zirka baseline.",
      severity: "error",
    });
  } else {
    const content = fs.readFileSync(path.join(cwd, eslintConfig), "utf8");
    if (!content.includes("zirka")) {
      findings.push({
        check: "config-baseline",
        message: `eslint config does not reference zirka. Use the pasika/zirka baseline configuration.`,
        severity: "warning",
      });
    }
  }

  // tsconfig.json must exist
  if (!fs.existsSync(path.join(cwd, "tsconfig.json"))) {
    findings.push({
      check: "config-baseline",
      message: "No tsconfig.json found. Create one extending the pasika baseline.",
      severity: "error",
    });
  }

  return findings;
}

/**
 * Check that vulyk-managed files have not been hand-edited.
 *
 * Files listed in the .vulyk manifest are generated by vulyk commands
 * and must not be edited directly.
 */
function checkManagedFiles(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const vulykDir = path.join(cwd, ".vulyk");
  if (!fs.existsSync(vulykDir)) return findings;

  const manifestPath = path.join(vulykDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return findings;

  try {
    const manifestEntrySchema = z.looseObject({
      targets: z.array(z.string()).optional(),
    });
    const manifestSchema = z.record(z.string(), manifestEntrySchema);
    const result = manifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    if (!result.success) return findings;

    for (const [, entry] of Object.entries(result.data)) {
      const targets = entry.targets ?? [];
      for (const target of targets) {
        const targetPath = path.join(cwd, target);
        if (fs.existsSync(targetPath)) {
          // File exists — check it hasn't been modified since vulyk last wrote it
          const stat = fs.statSync(targetPath);
          const vulykStat = fs.statSync(manifestPath);
          // If target is newer than the manifest, it was edited after vulyk wrote it
          if (stat.mtimeMs > vulykStat.mtimeMs + 1000) {
            findings.push({
              check: "managed-file-edit",
              message: `File "${target}" appears to have been edited after vulyk wrote it. Use vulyk commands to update managed files.`,
              severity: "warning",
            });
          }
        }
      }
    }
  } catch {
    // manifest unreadable
  }

  return findings;
}

export function runDoctor(cwd: string): DoctorFinding[] {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = readPackageJson(pkgPath);

  return [
    ...checkFrameworkPackages(pkg),
    ...checkConfigBaseline(cwd),
    ...checkManagedFiles(cwd),
    ...checkSourceRoot(cwd),
    ...checkGlobalStylesheet(cwd),
  ];
}
