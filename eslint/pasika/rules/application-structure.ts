/**
 * ESLint rule: pasika/application-structure
 *
 * Enforces the path-based parts of the Application Structure, Configuration,
 * and Component Placement rules. Questions about ownership or extraction stay
 * with the cross-file rules because they need the project graph.
 *
 * @see docs/code-organization-guide/rules/application-structure-rule.md
 * @see docs/code-organization-guide/rules/configuration-rule.md
 * @see docs/code-organization-guide/rules/component-placement-rule.md
 */
import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { parseModule, type ExportKind } from "../project/parse-module.js";
import { segmentsOf, SUPPORT_FOLDERS } from "../project/ccf.js";

const MODULE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const ROUTING_FILES = new Set([
  "default",
  "error",
  "instrumentation",
  "layout",
  "loading",
  "middleware",
  "not-found",
  "page",
  "route",
  "template",
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
  for (const kind of ["component", "hook", "type", "schema", "constant", "function"] as const) {
    if (kinds.has(kind)) return EXPECTED_SUPPORT_FOLDER[kind];
  }
  return undefined;
}

function configModuleRoot(filename: string, sourceRoot: string): string | undefined {
  const segments = segmentsOf(filename, sourceRoot);
  if (segments[0] !== "config" || segments.length < 3) return undefined;
  return path.join(sourceRoot, "config", segments[1] ?? "");
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
    const sourceRoot = path.resolve("src");
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
    }

    const currentFolder = path.basename(path.dirname(filename));
    const kinds = exportedKinds(filename);
    if (!SUPPORT_FOLDERS.has(currentFolder)) {
      const expected = expectedSupportFolder(kinds);
      if (expected !== undefined && segments.length > 2) {
        return report(
          context,
          `Move this file to a ${expected}/ folder; ${currentFolder}/ is not a recognized support folder.`,
        );
      }
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

    return {};
  },
};
