/**
 * ESLint rule: pasika/require-barrel-star-exports
 *
 * Requires support-folder barrels to mirror local sibling modules through
 * wildcard re-exports instead of filtering or renaming exports in the barrel.
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */

import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { parseModule } from "../project/parse-module";

const SUPPORT_FOLDERS = new Set(["constants", "types", "schemas"]);
const INDEX_NAMES = new Set(["index.ts", "index.tsx", "index.mts", "index.cts"]);
const MODULE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

function resolveSiblingModule(indexFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith("./")) return undefined;

  const relative = specifier.slice(2);
  if (!relative || relative.includes("/")) return undefined;

  const directory = path.dirname(indexFile);
  const direct = path.resolve(directory, relative);
  const candidates = path.extname(direct) ? [direct] : MODULE_EXTENSIONS.map((extension) => `${direct}${extension}`);

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

export const requireBarrelStarExportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "suggestion",
    docs: {
      description: "Require support-folder barrels to mirror local sibling modules through wildcard re-exports.",
    },
    fixable: "code",
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!INDEX_NAMES.has(path.basename(filename))) return {};
    if (!SUPPORT_FOLDERS.has(path.basename(path.dirname(filename)))) return {};

    return {
      ExportNamedDeclaration(node) {
        const sourceNode = node.source;
        const sourceValue = sourceNode?.value;
        if (!sourceNode || typeof sourceValue !== "string" || node.specifiers.length === 0) return;

        const siblingFile = resolveSiblingModule(filename, sourceValue);
        if (!siblingFile) return;

        let replacement: string | undefined;

        try {
          const siblingExports = parseModule(siblingFile).exports;
          if (siblingExports.length > 0) {
            const reExportedNames = new Set<string>();
            let hasRename = false;

            for (const specifier of node.specifiers) {
              if (specifier.local.type !== "Identifier" || specifier.exported.type !== "Identifier") {
                hasRename = true;
                break;
              }

              if (specifier.local.name !== specifier.exported.name) {
                hasRename = true;
                break;
              }

              reExportedNames.add(specifier.local.name);
            }

            const siblingExportNames = new Set(siblingExports.map((moduleExport) => moduleExport.name));
            const exportsCompleteSurface =
              !hasRename &&
              reExportedNames.size === siblingExportNames.size &&
              [...siblingExportNames].every((name) => reExportedNames.has(name));

            if (exportsCompleteSurface) {
              const siblingExportsOnlyTypes = siblingExports.every((moduleExport) => moduleExport.kind === "type");
              const statementIsTypeOnly = context.sourceCode.getText(node).trimStart().startsWith("export type ");

              if (!statementIsTypeOnly || siblingExportsOnlyTypes) {
                const keyword = siblingExportsOnlyTypes ? "export type *" : "export *";
                replacement = `${keyword} from ${context.sourceCode.getText(sourceNode)};`;
              }
            }
          }
        } catch {
          // Reporting does not depend on parsing the sibling; parsing only enables a safe autofix.
        }

        context.report({
          node,
          message:
            "A support-folder barrel MUST re-export a local sibling module with export * or export type *; remove unwanted exports or rename declarations in the sibling module instead of filtering or renaming them in the barrel.",
          ...(replacement
            ? {
                fix(fixer: Rule.RuleFixer) {
                  return fixer.replaceText(node, replacement);
                },
              }
            : {}),
        });
      },
    };
  },
};
