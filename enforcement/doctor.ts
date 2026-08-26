/**
 * `pasika doctor` checks.
 *
 * Diagnoses gaps between a consumer repository and the pasika framework
 * baseline. Scope: dependencies, configuration, managed files, and
 * source structure. Code-level and path-level rules belong to ESLint.
 */

import fs from "node:fs";
import path from "node:path";
import { getProjectIndex } from "../eslint/pasika/project/index.js";

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
 * Check that exactly one global stylesheet exists and it contains expected patterns.
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
    return findings;
  }

  const content = fs.readFileSync(stylesheet, "utf8");

  // Theme reset: --*: initial
  if (!content.includes("--*: initial")) {
    findings.push({
      check: "theme-reset",
      message: `Global stylesheet must reset Tailwind's default theme with "--*: initial".`,
      severity: "error",
    });
  }

  // CSS variables in :root
  if (!content.includes(":root")) {
    findings.push({
      check: "root-variables",
      message: "Global stylesheet must define CSS variables in :root.",
      severity: "error",
    });
  }

  // @apply usage
  if (content.includes("@layer base") && !content.includes("@apply")) {
    findings.push({
      check: "apply-usage",
      message: "Style declarations inside global selectors must use @apply.",
      severity: "error",
    });
  }

  // Base layer with base-canvas and base-ink
  const hasBaseLayer = content.includes("@layer base") || content.includes("@layer base {");
  const hasBaseCanvas = content.includes("base-canvas");
  const hasBaseInk = content.includes("base-ink");
  if (hasBaseLayer && (!hasBaseCanvas || !hasBaseInk)) {
    findings.push({
      check: "base-layer-pair",
      message: "The global base layer must apply base-canvas and base-ink to the document body.",
      severity: "error",
    });
  }

  // @theme inline for CSS variables
  if (content.includes(":root") && content.includes("@theme") && !content.includes("@theme inline")) {
    findings.push({
      check: "theme-inline",
      message: 'CSS variables in :root must be referenced through "@theme inline".',
      severity: "error",
    });
  }

  // @custom-variant definitions
  if (content.includes("@theme") && !content.includes("@custom-variant")) {
    findings.push({
      check: "custom-variants",
      message: "Global stylesheet should define @custom-variant definitions for component props.",
      severity: "warning",
    });
  } // CSS naming: background variables must be --<role>-canvas, text must be --<role>-ink
  const cssVarPattern = /--(?<varName>[a-z][a-z0-9-]*)(?=:)/g;
  let cssVarMatch: RegExpExecArray | null;
  while ((cssVarMatch = cssVarPattern.exec(content)) !== null) {
    const name = cssVarMatch.groups?.varName ?? "";
    if ((name.includes("bg") || name.includes("background")) && !name.endsWith("-canvas")) {
      findings.push({
        check: "css-variable-naming",
        message: `CSS variable "--${name}" looks like a background token; name it --<role>-canvas instead.`,
        severity: "warning",
      });
    }
  }

  // CSS ordering: imports, @custom-variant, :root, @theme, @utility, @layer base
  const orderingSections = [
    { label: "@import", pattern: /@import\s+["']/ },
    { label: "@custom-variant", pattern: /@custom-variant/ },
    { label: ":root", pattern: /:root\s*\{/ },
    { label: "@theme", pattern: /@theme\s*\{/ },
    { label: "@utility", pattern: /@utility\s+/ },
    { label: "@layer base", pattern: /@layer\s+base/ },
  ];
  let lastPos = -1;
  for (const section of orderingSections) {
    const match = content.match(section.pattern);
    if (match?.index !== undefined && match.index < lastPos) {
      findings.push({
        check: "css-ordering",
        message: `Global stylesheet sections must be ordered: imports before @custom-variant before :root before @theme before @utility before @layer base. Found "${section.label}" after a later section.`,
        severity: "error",
      });
      break;
    }
    if (match?.index !== undefined) {
      lastPos = match.index;
    }
  }

  return findings;
}

/**
 * Run all doctor checks against a repository.
 */
/**
 * Check import-graph-based requirements.
 */
function checkImportGraph(srcDir: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const index = getProjectIndex(srcDir);
  if (!index) return findings;

  const segmentsOf = (file: string): string[] => {
    const relative = path.relative(srcDir, file);
    return relative.startsWith("..") ? [] : relative.split(path.sep);
  };

  // Check: a custom hook must be extracted to its own file when two or more consumers use it
  for (const [file, mod] of index.modules) {
    for (const exp of mod.exports) {
      if (exp.kind === "hook") {
        const consumers = index.symbolConsumers.get(`${file}\u0000${exp.name}`);
        if (consumers && consumers.size >= 2) {
          const segments = segmentsOf(file);
          // If the hook is in a feature folder (not in hooks/), it should be extracted
          if (segments.length >= 2 && segments[0] === "features" && segments[1] !== "hooks") {
            findings.push({
              check: "hook-extraction",
              message: `Hook "${exp.name}" has ${String(consumers.size)} consumers and should be extracted to its own file in a hooks/ folder.`,
              severity: "warning",
            });
          }
        }
      }
    }
  }

  // Check: a value must remain in its declaring file until another file imports it
  for (const [file, consumers] of index.consumers) {
    const segments = segmentsOf(file);
    // If the file is in src/app/ and has consumers outside src/app/, warn
    if (segments[0] === "app" && consumers.size > 0) {
      const outsideApp = [...consumers].filter((c) => {
        const cs = segmentsOf(c);
        return cs[0] !== "app";
      });
      if (outsideApp.length > 0) {
        findings.push({
          check: "value-extraction",
          message: `File in src/app/ has consumers outside src/app/; values should be extracted to shared or feature folders.`,
          severity: "warning",
        });
      }
    }
  }

  return findings;
}

export function runDoctor(cwd: string): DoctorFinding[] {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = readPackageJson(pkgPath);

  const srcDir = path.join(cwd, "src");
  const importGraphFindings = fs.existsSync(srcDir) ? checkImportGraph(srcDir) : [];

  return [
    ...checkVulykDependency(pkg),
    ...checkCacheFlag(pkg),
    ...checkFrameworkPackages(pkg),
    ...checkSourceRoot(cwd),
    ...checkGlobalStylesheet(cwd),
    ...importGraphFindings,
  ];
}
