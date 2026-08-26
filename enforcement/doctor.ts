/**
 * `pasika doctor` checks.
 *
 * Diagnoses gaps between a consumer repository and the pasika framework
 * baseline. Scope: dependencies, configuration, managed files, and
 * source structure. Code-level and path-level rules belong to ESLint.
 */

import fs from "node:fs";
import path from "node:path";

export interface DoctorFinding {
  /** Which requirement this relates to. */
  check: string;
  /** Human-readable description. */
  message: string;
  /** Severity: error blocks adoption, warning is informational. */
  severity: "error" | "warning";
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function readPackageJson(filePath: string): PackageJson {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON parse result needs narrowing
      const obj = parsed as Record<string, unknown>;
      return {
        dependencies: isStringRecord(obj.dependencies) ? obj.dependencies : undefined,
        devDependencies: isStringRecord(obj.devDependencies) ? obj.devDependencies : undefined,
        scripts: isStringRecord(obj.scripts) ? obj.scripts : undefined,
      };
    }
  } catch {
    // missing or unparseable
  }
  return {};
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check that vulyk is not listed as a dependency.
 *
 * vulyk MUST run as an ephemeral command (npx vulyk@latest), not as a
 * package.json dependency.
 */
function checkVulykDependency(pkg: PackageJson): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const inDeps = pkg.dependencies?.vulyk !== undefined;
  const inDevDeps = pkg.devDependencies?.vulyk !== undefined;

  if (inDeps || inDevDeps) {
    findings.push({
      check: "no-vulyk-in-package-json",
      message: 'Vulyk must not be a package.json dependency. Run it as "npx vulyk@latest" instead.',
      severity: "error",
    });
  }
  return findings;
}

/**
 * Check that lint scripts do not pass --cache.
 *
 * Rules that compare a file against the rest of the project require every
 * file in the run, so --cache defeats them.
 */
function checkCacheFlag(pkg: PackageJson): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const lintScripts = Object.entries(pkg.scripts ?? {}).filter(([name]) => name === "lint" || name === "fix");

  for (const [, script] of lintScripts) {
    if (script.includes("--cache")) {
      findings.push({
        check: "no-cache-flag",
        message:
          "Lint scripts must not pass ESLint's --cache flag because cross-file rules require every file in the run.",
        severity: "error",
      });
      break;
    }
  }
  return findings;
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
 * Run all doctor checks against a repository.
 */
export function runDoctor(cwd: string): DoctorFinding[] {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = readPackageJson(pkgPath);

  return [
    ...checkVulykDependency(pkg),
    ...checkCacheFlag(pkg),
    ...checkFrameworkPackages(pkg),
    ...checkSourceRoot(cwd),
  ];
}
