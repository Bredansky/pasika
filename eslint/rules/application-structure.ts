/**
 * ESLint rule: pasika/application-structure
 *
 * Enforces the path-based parts of the Application Structure, Configuration,
 * and Component Placement rules. Questions about ownership or extraction stay
 * with the cross-file rules because they need the project graph.
 *
 * @see docs/next-codebase-guide/rules/application-structure-rule.md
 * @see docs/next-codebase-guide/rules/configuration-rule.md
 * @see docs/next-codebase-guide/rules/component-placement-rule.md
 */
import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { parseModule, type ExportKind } from "../project/parse-module";
import { segmentsOf, SUPPORT_FOLDERS } from "../project/ccf";
import { sourceRootOf } from "./project-root";

const MODULE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const ROUTING_FILES = new Set([
  "default",
  "error",
  "global-error",
  "instrumentation",
  "layout",
  "loading",
  "middleware",
  "not-found",
  "page",
  "route",
  "template",
  // File conventions Next.js requires to keep their exact names in src/app/
  "apple-icon",
  "icon",
  "manifest",
  "opengraph-image",
  "robots",
  "sitemap",
  "twitter-image",
]);
const EXPECTED_SUPPORT_FOLDER: Partial<Record<ExportKind, string>> = {
  hook: "hooks",
  type: "types",
  schema: "schemas",
  constant: "constants",
  function: "utils",
};

function report(context: Rule.RuleContext, message: string): Rule.NodeListener {
  return {
    Program(node) {
      context.report({ node, loc: { line: 1, column: 0 }, message });
    },
  };
}

function isCodeFile(filename: string): boolean {
  return MODULE_EXTENSIONS.has(path.extname(filename));
}

function isRootSupportFolder(folder: string): boolean {
  return SUPPORT_FOLDERS.has(folder);
}

function exportedKinds(filename: string): Set<ExportKind> {
  try {
    return new Set(parseModule(filename).exports.map((moduleExport) => moduleExport.kind));
  } catch {
    return new Set();
  }
}

function expectedSupportFolder(kinds: Set<ExportKind>): string | undefined {
  // `type` is the fallback: a file that exports a schema plus its inferred
  // type, or functions plus their return-type interfaces, is a schema or utils
  // file, not a types file. A folder is a types/ folder only when types are all
  // the file holds.
  for (const kind of ["component", "hook", "schema", "function", "constant", "type"] as const) {
    if (kinds.has(kind)) return EXPECTED_SUPPORT_FOLDER[kind];
  }
  return undefined;
}

function configModuleRoot(filename: string, sourceRoot: string): string | undefined {
  const segments = segmentsOf(filename, sourceRoot);
  if (segments[0] !== "config" || segments.length < 3) return undefined;
  return path.join(sourceRoot, "config", segments[1] ?? "");
}

/**
 * First folder level that can hold a component folder: inside a feature folder
 * (features/<feature>/...) or directly under compositions/ or shared/.
 * Returns -1 for scopes where no folder may hold a component.
 */
function componentFolderStart(segments: string[]): number {
  if (segments[0] === "features") return 2;
  if (segments[0] === "compositions" || segments[0] === "shared") return 1;
  return -1;
}

/**
 * A folder inside a feature folder, compositions/, or shared/ that is not a
 * support folder must be a component folder: it must contain a `.tsx` file with
 * the same name, and an index.ts that named-re-exports it. Returns the first
 * violation walking from the file's own folder outward, so the most local
 * problem is reported first.
 */
function componentFolderViolation(segments: string[], sourceRoot: string): string | undefined {
  const start = componentFolderStart(segments);
  if (start < 0) return undefined;

  for (let depth = segments.length - 2; depth >= start; depth -= 1) {
    const folder = segments[depth];
    if (!folder || SUPPORT_FOLDERS.has(folder)) continue;
    const folderPath = path.join(sourceRoot, ...segments.slice(0, depth + 1));
    const label = `src/${segments.slice(0, depth + 1).join("/")}/`;
    if (!fs.existsSync(path.join(folderPath, `${folder}.tsx`))) {
      return `A folder that is not a support folder must be a component folder; add "${folder}.tsx" to ${label} or move its files into a support folder.`;
    }
    if (!fs.existsSync(path.join(folderPath, "index.ts"))) {
      return `A component folder must have an index.ts that named-re-exports its component; add index.ts to ${label}.`;
    }
  }
  return undefined;
}

export const applicationStructureRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce the repository's application, configuration, and support-folder structure.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    const segments = segmentsOf(filename, sourceRoot);
    if (segments.length === 0) return {};

    const [topLevel, secondLevel] = segments;
    if (topLevel === undefined) return {};

    if (
      segments.length > 1 &&
      topLevel !== "app" &&
      topLevel !== "compositions" &&
      topLevel !== "features" &&
      topLevel !== "shared" &&
      topLevel !== "config" &&
      topLevel !== "locales" &&
      !isRootSupportFolder(topLevel)
    ) {
      return report(
        context,
        `Move this source file under an allowed src/ folder; "src/${topLevel}/" is not part of the application structure.`,
      );
    }

    if (topLevel === "features" && segments.length >= 2 && secondLevel !== undefined) {
      if (SUPPORT_FOLDERS.has(secondLevel)) {
        return report(
          context,
          `Move this support folder inside a feature folder; "src/features/${secondLevel}/" does not belong to a feature.`,
        );
      }
      if (segments.length === 2) {
        return report(context, "src/features/ must contain only feature folders, not source files.");
      }
    }

    if (topLevel === "config") {
      if (segments.length === 2) {
        return report(
          context,
          "A configuration module must be a src/config/<config-name>/ folder with index.ts as its entry point.",
        );
      }

      const moduleRoot = configModuleRoot(filename, sourceRoot);
      if (moduleRoot && !fs.existsSync(path.join(moduleRoot, "index.ts"))) {
        return report(
          context,
          `Add src/config/${path.basename(moduleRoot)}/index.ts as the configuration module entry point.`,
        );
      }

      if (moduleRoot && segments.length === 3 && path.basename(filename) !== "index.ts") {
        const kinds = exportedKinds(filename);
        const expected = expectedSupportFolder(kinds);
        if (expected !== undefined) {
          return report(
            context,
            `Move this configuration support file into src/config/${path.basename(moduleRoot)}/${expected}/.`,
          );
        }
      }
    }

    if (topLevel === "app" && isCodeFile(filename)) {
      const basename = path.basename(filename, path.extname(filename));
      const currentFolder = path.basename(path.dirname(filename));
      if (SUPPORT_FOLDERS.has(currentFolder)) {
        return report(
          context,
          "src/app/ may contain routing files and framework assets, but ordinary components and support files must live outside src/app/.",
        );
      }
      if (!ROUTING_FILES.has(basename) && path.extname(filename) !== ".css") {
        return report(
          context,
          "src/app/ may contain routing files and framework assets, but ordinary components and support files must live outside src/app/.",
        );
      }
      // Routing files are exempt from the support-folder placement rules below:
      // Next.js dictates their location (e.g. src/app/api/<name>/route.ts), and
      // the route handler exports a function, which the support-folder check
      // would otherwise demand moving to src/utils/.
      if (ROUTING_FILES.has(basename) || path.extname(filename) === ".css") return {};
    }

    const currentFolder = path.basename(path.dirname(filename));
    const kinds = exportedKinds(filename);
    const isConfigModuleRoot = topLevel === "config" && segments.length === 3 && path.basename(filename) === "index.ts";
    if (isConfigModuleRoot) return {};
    if (!SUPPORT_FOLDERS.has(currentFolder)) {
      const expected = expectedSupportFolder(kinds);
      if (expected !== undefined && segments.length > 2) {
        return report(
          context,
          `Move this file to a ${expected}/ folder; ${currentFolder}/ is not a recognized support folder.`,
        );
      }
      const violation = componentFolderViolation(segments, sourceRoot);
      if (violation !== undefined) return report(context, violation);
      return {};
    }

    if (kinds.has("component")) {
      return report(
        context,
        `A support folder must not contain a component; move ${path.basename(filename)} beside ${currentFolder}/.`,
      );
    }

    const expected = expectedSupportFolder(kinds);
    if (expected !== undefined && expected !== currentFolder) {
      return report(
        context,
        `Move this file to a ${expected}/ folder; ${currentFolder}/ is reserved for ${expected === "utils" ? "utilities" : expected}.`,
      );
    }

    const violation = componentFolderViolation(segments, sourceRoot);
    if (violation !== undefined) return report(context, violation);

    return {};
  },
};
