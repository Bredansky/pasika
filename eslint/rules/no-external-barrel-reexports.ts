/**
 * ESLint rule: pasika/no-external-barrel-reexports
 *
 * Barrels expose declarations owned by their directory; forwarding unrelated
 * modules creates aliases with no independent purpose.
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";

const INDEX_FILES = new Set(["index.ts", "index.tsx", "index.mts", "index.cts"]);

function isExternalSource(directory: string, specifier: unknown): boolean {
  if (typeof specifier !== "string" || !specifier.startsWith("./")) return true;

  const target = path.resolve(directory, specifier);
  const relative = path.relative(directory, target);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

export const noExternalBarrelReexportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow index barrels forwarding exports owned by other directories.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!INDEX_FILES.has(path.basename(filename))) return {};

    const directory = path.dirname(filename);

    function checkSource(node: Rule.Node, specifier: unknown): void {
      if (!isExternalSource(directory, specifier)) return;

      context.report({
        node,
        message:
          `index.ts must re-export only modules within its own folder; "${String(specifier)}" belongs elsewhere. ` +
          "Import directly from the owning module instead. " +
          "See docs/next-codebase-guide/rules/exports-and-imports-rule.md",
      });
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        checkSource(node, node.source.value);
      },
    };
  },
};
