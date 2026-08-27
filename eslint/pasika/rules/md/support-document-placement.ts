/**
 * @fileoverview Rules must live in rules/, references must live in references/.
 */
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Root } from "mdast";
import { getFilename } from "./helpers";

export const supportDocumentPlacementRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Rules must live in rules/, references must live in references/.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        const parentFolder = path.basename(path.dirname(filename));

        if (filename.endsWith("-rule.md") && parentFolder !== "rules") {
          context.report({
            node,
            message: `rule lives in "${parentFolder}/" instead of "rules/"`,
          });
        }

        if (filename.endsWith("-reference.md") && parentFolder !== "references") {
          context.report({
            node,
            message: `reference lives in "${parentFolder}/" instead of "references/"`,
          });
        }
      },
    };
  },
};
