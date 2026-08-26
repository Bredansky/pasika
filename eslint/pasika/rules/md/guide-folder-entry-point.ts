/**
 * @fileoverview Guide folders must have an entry point.
 */
import path from "node:path";
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename } from "./helpers.js";
import { findDocsRoot, getProjectDocs } from "./project-index.js";

export const guideFolderEntryPointRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Guide folders must have an entry point.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        const docsRoot = findDocsRoot(filename);
        if (!docsRoot) return;

        const docs = getProjectDocs(docsRoot);

        // Find guide folders: folders that hold rules/ or references/
        const guideFolders = new Set(
          docs
            .filter((doc) => ["rules", "references"].includes(path.basename(path.dirname(doc.filePath))))
            .map((doc) => path.dirname(path.dirname(doc.filePath)))
            // A rules/ or references/ folder directly under docs root belongs to no guide
            .filter((folder) => path.resolve(folder) !== path.resolve(docsRoot)),
        );

        // Check if current file is in a guide folder that needs an entry point
        const currentDir = path.dirname(filename);

        if (guideFolders.has(currentDir)) {
          const expectedEntryPoint = `${path.basename(currentDir)}.md`;
          const hasEntryPoint = docs.some(
            (doc) =>
              doc.kind === "guide" && path.dirname(doc.filePath) === currentDir && doc.fileName === expectedEntryPoint,
          );

          if (!hasEntryPoint) {
            context.report({
              node,
              message: `folder holds support documents but has no ${expectedEntryPoint} entry point`,
            });
          }
        }
      },
    };
  },
};
