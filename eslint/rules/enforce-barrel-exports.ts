/**
 * ESLint rule: pasika/enforce-barrel-exports
 *
 * Enforces the "Folder Nesting Rule" — index.ts only re-exports parent component.
 *
 * @see docs/next-codebase-guide/rules/folder-nesting-rule.md
 */

import path from "node:path";
import fs from "node:fs";
import type { Rule } from "eslint";
import { parseModule } from "../project/parse-module";

function isPascalCase(str: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(str);
}

function isKebabCase(str: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(str);
}

const SUPPORT_FOLDERS = new Set(["types", "schemas", "hooks", "constants", "utils", "config", "locales"]);

/**
 * The name the barrel must re-export: the component exported by the folder's
 * own `.tsx` file. For a smart component the folder and the component share a
 * PascalCase name (BlogPage/ → BlogPage), but a kebab folder holds a dumb
 * component whose PascalCase export differs from the folder name
 * (milestone/ → Milestone), so the folder name alone cannot identify it.
 */
function parentComponentName(dirPath: string, folderName: string): string | undefined {
  const componentFile = path.join(dirPath, `${folderName}.tsx`);
  if (!fs.existsSync(componentFile)) return undefined;
  try {
    const exports = parseModule(componentFile).exports;
    return exports.find((moduleExport) => moduleExport.kind === "component")?.name;
  } catch {
    return undefined;
  }
}

export const enforceBarrelExportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce index.ts barrels only re-export the parent component.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename) return {};

    const baseName = path.basename(filename);
    if (baseName !== "index.ts" && baseName !== "index.cts" && baseName !== "index.mts") return {};

    const dirPath = path.dirname(filename);
    const folderName = path.basename(dirPath);
    const parentFolderName = path.basename(path.dirname(dirPath));

    if (SUPPORT_FOLDERS.has(folderName)) return {};
    if (!isPascalCase(folderName) && !isKebabCase(folderName)) return {};

    const parentName = parentComponentName(dirPath, folderName);
    if (!parentName) return {};

    if (!isPascalCase(parentFolderName) && !isKebabCase(parentFolderName)) return {};

    const reExportedNames = new Set<string>();

    return {
      ExportNamedDeclaration(node) {
        if (!node.source) return;
        for (const spec of node.specifiers) {
          if (spec.exported.type === "Identifier") {
            reExportedNames.add(spec.exported.name);
          }
        }
      },

      "Program:exit"() {
        if (reExportedNames.size === 0) return;

        if (!reExportedNames.has(parentName)) {
          context.report({
            loc: { line: 1, column: 0 },
            message:
              `index.ts in "${folderName}/" must re-export "${parentName}". ` +
              "See docs/next-codebase-guide/rules/folder-nesting-rule.md",
          });
          return;
        }

        const nonParentExports = [...reExportedNames].filter((n) => n !== parentName);
        if (nonParentExports.length > 0) {
          context.report({
            loc: { line: 1, column: 0 },
            message:
              `index.ts must not re-export exclusive children: ${nonParentExports.join(", ")}. ` +
              `Only "${parentName}" may be re-exported. ` +
              "See docs/next-codebase-guide/rules/folder-nesting-rule.md",
          });
        }
      },
    };
  },
};
