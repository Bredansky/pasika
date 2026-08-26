/**
 * `pasika doctor` checks.
 *
 * Diagnoses gaps between a consumer repository and the pasika framework
 * baseline. Scope: dependencies, configuration, managed files, and
 * source structure. Code-level and path-level rules belong to ESLint.
 */

import fs from "node:fs";
import path from "node:path";
import { getProjectIndex, symbolKey } from "../eslint/pasika/project/index.js";

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

  // Check: config types/schemas should be in the config module's support folder
  for (const [file, mod] of index.modules) {
    const segments = segmentsOf(file);
    if (segments[0] !== "config" || segments.length < 3) continue;
    for (const exp of mod.exports) {
      if (exp.kind === "type" || exp.kind === "schema") {
        const consumers = index.symbolConsumers.get(`${file}\u0000${exp.name}`);
        const allConsumers = [...(consumers ?? [])];
        const configConsumers = allConsumers.filter((c) => segmentsOf(c)[0] === "config");
        if (allConsumers.length > 0 && configConsumers.length < allConsumers.length) {
          findings.push({
            check: "config-extraction",
            message: `${exp.kind} "${exp.name}" in config is used outside config; consider moving it to the root support folder.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Check: component must not be nested only because it has support files
  for (const [file, consumers] of index.consumers) {
    const segments = segmentsOf(file);
    if (segments.length < 3 || segments[0] !== "features") continue;
    const featureName = segments[1];
    // Check if the parent feature folder has a component with the same base name
    if (segments.length >= 3) {
      const folderName = segments[segments.length - 1];
      if (folderName && folderName !== featureName) {
        const outsideConsumers = [...consumers].filter((c) => {
          const cs = segmentsOf(c);
          return cs.length < 3 || cs[1] !== featureName || cs[2] !== folderName;
        });
        if (outsideConsumers.length > 0) {
          findings.push({
            check: "component-nesting",
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- folderName is string after truthiness guard
            message: `Component in src/features/${featureName}/${folderName}/ is imported outside its folder; consider flattening.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Check: locales consumed by multiple feature folders must be in the shared locales object
  // Find files that import locales from @/locales or ../locales
  const localeConsumers = new Map<string, Set<string>>(); // featureName -> set of locale keys used
  for (const [file, mod] of index.modules) {
    for (const imp of mod.imports) {
      if (!imp.specifier.includes("locales")) continue;
      const segments = segmentsOf(file);
      const featureName = segments[0] === "features" ? segments[1] : undefined;
      if (!featureName) continue;
      for (const name of imp.names) {
        if (!localeConsumers.has(name)) localeConsumers.set(name, new Set());
        localeConsumers.get(name)?.add(featureName);
      }
    }
  }
  for (const [localeName, features] of localeConsumers) {
    if (features.size > 1) {
      findings.push({
        check: "locale-placement",
        message: `Locale "${localeName}" is consumed by features ${[...features].join(", ")}. Shared locales must live in the top-level locales object.`,
        severity: "warning",
      });
    }
  }

  // Check: types/schemas in component files should stay until another file imports them directly
  for (const [file, mod] of index.modules) {
    const segments = segmentsOf(file);
    const isComponentFile =
      mod.exports.some((e) => e.kind === "component") || (segments[0] === "features" && segments.length >= 3);
    if (!isComponentFile) continue;
    for (const exp of mod.exports) {
      if (exp.kind !== "type" && exp.kind !== "schema") continue;
      const consumers = index.symbolConsumers.get(symbolKey(file, exp.name));
      if (!consumers || consumers.size === 0) continue;
      // If there are consumers outside the same folder, the type should be extracted
      const sameFolder = segments.slice(0, -1).join(path.sep);
      const outsideFolder = [...consumers].some((c) => {
        const cs = segmentsOf(c);
        return cs.slice(0, -1).join(path.sep) !== sameFolder;
      });
      if (outsideFolder) {
        findings.push({
          check: "type-extraction",
          message: `${exp.kind} "${exp.name}" in a component file has consumers outside its folder. Consider extracting it.`,
          severity: "warning",
        });
      }
    }
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
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return findings;

    for (const [, value] of Object.entries(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON parse result needs narrowing
      parsed as Record<string, unknown>,
    )) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON parse result needs narrowing
      const entry = value as Record<string, unknown>;
      const targets = Array.isArray(entry.targets) ? entry.targets : [];
      for (const target of targets) {
        if (typeof target !== "string") continue;
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

/**
 * Check that custom utilities in the global stylesheet use @apply.
 *
 * Every @utility rule must use @apply for styling declarations rather
 * than raw CSS property declarations.
 */
function checkCustomUtilityApply(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const stylesheet = findGlobalStylesheet(cwd);
  if (!stylesheet) return findings;

  const content = fs.readFileSync(stylesheet, "utf8");
  // Match @utility blocks: @utility name { ... }
  const utilityPattern = /@utility\s+(?<name>\S+)\s*\{(?<body>[^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = utilityPattern.exec(content)) !== null) {
    const name = match.groups?.name ?? "";
    const body = match.groups?.body ?? "";
    // If the body contains raw CSS property declarations (word: value) without @apply
    const hasRawProperty = /\b[a-z][a-z-]+\s*:[^:]/.test(body);
    const hasApply = body.includes("@apply");
    if (hasRawProperty && !hasApply) {
      findings.push({
        check: "custom-utility-apply",
        message: `Custom utility "${name}" must use @apply for styling declarations.`,
        severity: "error",
      });
    }
  }
  return findings;
}

/**
 * Check that repeated canvas+ink style combinations become surface utilities.
 */
function checkSurfaceUtility(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const stylesheet = findGlobalStylesheet(cwd);
  if (!stylesheet) return findings;

  const content = fs.readFileSync(stylesheet, "utf8");
  // Look for repeated bg-*-canvas + text-*-ink patterns in @apply blocks
  const applyPattern = /@apply\s+(?<classes>[^;]+);/g;
  const combinations = new Map<string, number>();
  let applyMatch: RegExpExecArray | null;
  while ((applyMatch = applyPattern.exec(content)) !== null) {
    const classes = (applyMatch.groups?.classes ?? "").trim().split(/\s+/).sort().join(" ");
    // Only track combinations with canvas + ink
    if (classes.includes("canvas") && classes.includes("ink")) {
      combinations.set(classes, (combinations.get(classes) ?? 0) + 1);
    }
  }
  for (const [combo, count] of combinations) {
    if (count >= 2 && !combo.includes("@utility")) {
      findings.push({
        check: "surface-utility",
        message: `Combination "${combo}" appears ${String(count)} times. Create a *-surface custom Tailwind utility for it.`,
        severity: "warning",
      });
    }
  }
  return findings;
}

/**
 * Check that utility class groups from the same theme-variable namespace
 * use the namespace prefix.
 */
function checkThemeVariableNamespace(cwd: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const stylesheet = findGlobalStylesheet(cwd);
  if (!stylesheet) return findings;

  const content = fs.readFileSync(stylesheet, "utf8");
  // Extract @theme inline variable names
  const themePattern = /--(?<var>[a-z][a-z0-9-]*)/g;
  const namespaces = new Set<string>();
  let themeMatch: RegExpExecArray | null;
  while ((themeMatch = themePattern.exec(content)) !== null) {
    const segments = (themeMatch.groups?.var ?? "").split("-");
    if (segments.length >= 2 && segments[0]) {
      namespaces.add(segments[0]);
    }
  }

  // Check @apply blocks for multiple utilities from the same namespace without prefix
  const applyPattern = /@apply\s+(?<classes>[^;]+);/g;
  let applyMatch: RegExpExecArray | null;
  while ((applyMatch = applyPattern.exec(content)) !== null) {
    const classes = (applyMatch.groups?.classes ?? "").trim().split(/\s+/);
    for (const ns of namespaces) {
      const matching = classes.filter((c) => c.startsWith(`${ns}-`) || c === ns);
      if (matching.length >= 2) {
        // Check if they all share a deeper prefix
        const prefixes = matching.map((c) => c.split("-").slice(0, 2).join("-"));
        const uniquePrefixes = [...new Set(prefixes)];
        if (uniquePrefixes.length > 1) {
          findings.push({
            check: "theme-variable-namespace",
            message: `Utility classes ${matching.join(", ")} use namespace "${ns}" but lack a shared prefix. Use the theme-variable namespace prefix.`,
            severity: "warning",
          });
        }
      }
    }
  }
  return findings;
}

/**
 * Check for repeated class combinations across components that should
 * become shared custom utilities, and single-component styling that
 * must stay local.
 */
function checkComponentStyleDedup(srcDir: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  if (!fs.existsSync(srcDir)) return findings;

  // Map from sorted class combination to the set of component files using it
  const comboToFiles = new Map<string, Set<string>>();
  // Map from individual class to the set of component files using it
  const classToFiles = new Map<string, Set<string>>();

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
        walk(full);
      }
      if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx"))) {
        const content = fs.readFileSync(full, "utf8");
        const rel = path.relative(srcDir, full);
        // Extract static className strings (not template literals or expressions)
        const classPattern = /className="(?<classes>[^"]+)"/g;
        let match: RegExpExecArray | null;
        while ((match = classPattern.exec(content)) !== null) {
          const classes = (match.groups?.classes ?? "").split(/\s+/).filter(Boolean);
          // Track each individual class
          for (const cls of classes) {
            if (!classToFiles.has(cls)) classToFiles.set(cls, new Set());
            classToFiles.get(cls)?.add(rel);
          }
          // Track 2+ class combinations (sorted)
          if (classes.length >= 2) {
            const key = [...classes].sort().join(" ");
            if (!comboToFiles.has(key)) comboToFiles.set(key, new Set());
            comboToFiles.get(key)?.add(rel);
          }
        }
      }
    }
  };
  walk(srcDir);

  // Find combinations used by 2+ different components
  for (const [combo, files] of comboToFiles) {
    if (files.size >= 2) {
      findings.push({
        check: "shared-style-dedup",
        message: `Class combination "${combo}" appears in ${String(files.size)} components. Create a named custom Tailwind utility for it.`,
        severity: "warning",
      });
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
    ...checkConfigBaseline(cwd),
    ...checkManagedFiles(cwd),
    ...checkSourceRoot(cwd),
    ...checkGlobalStylesheet(cwd),
    ...checkCustomUtilityApply(cwd),
    ...checkSurfaceUtility(cwd),
    ...checkThemeVariableNamespace(cwd),
    ...importGraphFindings,
    ...(fs.existsSync(srcDir) ? checkComponentStyleDedup(srcDir) : []),
  ];
}
