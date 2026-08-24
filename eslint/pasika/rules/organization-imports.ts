/**
 * ESLint rule: pasika/organization-imports
 *
 * Enforces the import conventions from the "Exports and Imports Rule":
 *  - Relative imports for nearby files (same folder, subfolder, one level up).
 *  - @/* alias for imports beyond one folder up.
 *  - Layer boundary enforcement (app → compositions → features → shared → root).
 *
 * @see docs/code-organization-guide/rules/exports-and-imports-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

const sourceRoot = path.resolve("src");
const rootSupportFolders = new Set(["config", "constants", "hooks", "locales", "schemas", "types", "utils"]);
const moduleExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const styleExtensions = new Set([".css", ".less", ".sass", ".scss"]);

function resolveSourceImport(filename: string, importPath: string): string | undefined {
  if (importPath.startsWith("@/")) {
    return path.resolve(sourceRoot, importPath.slice(2));
  }

  if (importPath.startsWith(".")) {
    return path.resolve(path.dirname(filename), importPath);
  }

  return undefined;
}

function sourceSegments(absolutePath: string): string[] | undefined {
  const relativePath = path.relative(sourceRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return relativePath.split(path.sep);
}

function isNearbyImport(filename: string, resolvedPath: string): boolean {
  const relativePath = path.relative(path.dirname(filename), resolvedPath);
  const segments = relativePath.split(path.sep).filter((segment) => segment !== ".");
  const parentTraversals = segments.filter((segment) => segment === "..").length;
  const nonParentSegments = segments.length - parentTraversals;

  return (parentTraversals === 0 && nonParentSegments <= 2) || (parentTraversals === 1 && nonParentSegments <= 1);
}

export const organizationImportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
  },
  create(context) {
    const filename = context.filename;

    if (!filename) {
      return {};
    }

    function reportImport(source: { type: string; value?: unknown }): void {
      if (typeof source.value !== "string") {
        return;
      }

      const importPath = source.value;
      const resolvedPath = resolveSourceImport(filename, importPath);

      if (!resolvedPath) {
        return;
      }

      const importer = sourceSegments(filename);
      const imported = sourceSegments(resolvedPath);

      if (!importer || !imported || importer.length === 0 || imported.length === 0) {
        return;
      }

      if (isNearbyImport(filename, resolvedPath) && importPath.startsWith("@/")) {
        context.report({
          node: source,
          message: "Use a relative path for imports in the same folder, a descendant, or one folder up.",
        });
      }

      if (!isNearbyImport(filename, resolvedPath) && importPath.startsWith(".")) {
        context.report({
          node: source,
          message: "Use the @/* alias for imports beyond one folder up.",
        });
      }

      const [importerLayer = "", importerFeature] = importer;
      const [importedLayer = "", importedFeature] = imported;
      const extension = path.extname(importPath);
      const isCodeModule = !extension || moduleExtensions.has(extension);
      const isAppLocalStyleImport =
        importerLayer === "app" && importedLayer === "app" && styleExtensions.has(extension);
      const importedIsRootSupport = rootSupportFolders.has(importedLayer);
      const importedIsSameConfig =
        importerLayer === "config" && importedLayer === "config" && importer[1] === imported[1];
      const isAllowed =
        (!isCodeModule && importerLayer === "app" && isAppLocalStyleImport) ||
        (isCodeModule &&
          importerLayer === "app" &&
          (importedLayer === "compositions" ||
            importedLayer === "features" ||
            importedLayer === "shared" ||
            importedIsRootSupport)) ||
        (isCodeModule &&
          importerLayer === "compositions" &&
          (importedLayer === "compositions" ||
            importedLayer === "features" ||
            importedLayer === "shared" ||
            importedIsRootSupport)) ||
        (isCodeModule &&
          importerLayer === "features" &&
          ((importedLayer === "features" && importerFeature === importedFeature) ||
            importedLayer === "shared" ||
            importedIsRootSupport)) ||
        (isCodeModule && importerLayer === "shared" && (importedLayer === "shared" || importedIsRootSupport)) ||
        (isCodeModule &&
          rootSupportFolders.has(importerLayer) &&
          importedIsRootSupport &&
          (importerLayer !== "config" || importedLayer !== "config" || importedIsSameConfig));

      if (!isAllowed) {
        context.report({
          node: source,
          message: "This import violates the src layer boundary.",
        });
      }
    }

    return {
      ImportDeclaration(node) {
        reportImport(node.source);
      },
      ExportAllDeclaration(node) {
        reportImport(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          reportImport(node.source);
        }
      },
      ImportExpression(node) {
        reportImport(node.source);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments[0]) {
          reportImport(node.arguments[0]);
        }
      },
    };
  },
};
