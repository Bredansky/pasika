/**
 * ESLint rule: pasika/import-boundaries
 *
 * Enforces the import conventions from the "Exports and Imports Rule":
 *  - Whichever of the relative path and the @/* alias has fewer segments, with
 *    a tie going to the relative path.
 *  - Layer boundary enforcement (app → compositions → features → shared → root).
 *
 * @see docs/code-organization-guide/rules/exports-and-imports-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { sourceRootOf } from "./project-root";

const rootSupportFolders = new Set(["config", "constants", "hooks", "locales", "schemas", "types", "utils"]);
const moduleExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const styleExtensions = new Set([".css", ".less", ".sass", ".scss"]);

function resolveSourceImport(sourceRoot: string, filename: string, importPath: string): string | undefined {
  if (importPath.startsWith("@/")) {
    return path.resolve(sourceRoot, importPath.slice(2));
  }

  if (importPath.startsWith(".")) {
    return path.resolve(path.dirname(filename), importPath);
  }

  return undefined;
}

function sourceSegments(sourceRoot: string, absolutePath: string): string[] | undefined {
  const relativePath = path.relative(sourceRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return relativePath.split(path.sep);
}

/** The relative form of an import, always prefixed so it reads as a path. */
function relativeSpecifier(filename: string, resolvedPath: string): string {
  const relativePath = path.relative(path.dirname(filename), resolvedPath).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

/** The `@/*` form of an import. */
function aliasSpecifier(sourceRoot: string, resolvedPath: string): string {
  return `@/${(sourceSegments(sourceRoot, resolvedPath) ?? []).join("/")}`;
}

/** Segments in a specifier: one per `../` step and one per name, ignoring a leading `./`. */
function segmentCount(specifier: string): number {
  return specifier
    .replace(/^@\//, "")
    .split("/")
    .filter((segment) => segment !== "." && segment !== "").length;
}

function describeSegments(count: number): string {
  return `${String(count)} segment${count === 1 ? "" : "s"}`;
}

/**
 * Whether the relative form is the one to use. Shorter wins, and a tie goes to
 * the relative form. Because crossing a layer always costs at least one `../`
 * while the alias spells the same tail, the alias always wins for a
 * cross-layer import without this needing to know what a layer is.
 */
function prefersRelative(sourceRoot: string, filename: string, resolvedPath: string): boolean {
  return segmentCount(relativeSpecifier(filename, resolvedPath)) <= segmentCount(aliasSpecifier(sourceRoot, resolvedPath));
}

export const importBoundariesRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
  },
  create(context) {
    const filename = context.filename;
    const sourceRoot = sourceRootOf(context);

    if (!filename) {
      return {};
    }

    function reportImport(source: { type: string; value?: unknown }): void {
      if (typeof source.value !== "string") {
        return;
      }

      const importPath = source.value;
      const resolvedPath = resolveSourceImport(sourceRoot, filename, importPath);

      if (!resolvedPath) {
        return;
      }

      const importer = sourceSegments(sourceRoot, filename);
      const imported = sourceSegments(sourceRoot, resolvedPath);

      if (!importer || !imported || importer.length === 0 || imported.length === 0) {
        return;
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
        // The fix is to move the file, so how the specifier is spelled does not matter yet.
        return;
      }

      const relativeForm = relativeSpecifier(filename, resolvedPath);
      const aliasForm = aliasSpecifier(sourceRoot, resolvedPath);
      const relativeSegments = segmentCount(relativeForm);
      const aliasSegments = segmentCount(aliasForm);

      function describeChoice(
        preferred: string,
        preferredSegments: number,
        other: string,
        otherSegments: number,
      ): string {
        const tie = preferredSegments === otherSegments ? ", and a tie goes to the relative path" : "";
        return (
          `Use "${preferred}" (${describeSegments(preferredSegments)}) ` +
          `instead of "${other}" (${describeSegments(otherSegments)})${tie}.`
        );
      }

      if (prefersRelative(sourceRoot, filename, resolvedPath) && importPath.startsWith("@/")) {
        context.report({
          node: source,
          message: describeChoice(relativeForm, relativeSegments, aliasForm, aliasSegments),
        });
        return;
      }

      if (!prefersRelative(sourceRoot, filename, resolvedPath) && importPath.startsWith(".")) {
        context.report({
          node: source,
          message: describeChoice(aliasForm, aliasSegments, relativeForm, relativeSegments),
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
