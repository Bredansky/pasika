/**
 * @fileoverview Documentation files must have a kind suffix in their filename.
 */
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename } from "./helpers.js";

export const docKindSuffixRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Documentation files must have a -guide, -rule, -reference, or -policy suffix.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;
        if (
          filename.endsWith("-guide.md") ||
          filename.endsWith("-rule.md") ||
          filename.endsWith("-reference.md") ||
          filename.endsWith("-policy.md")
        ) {
          return;
        }
        context.report({
          node,
          message: "file name carries no -guide, -rule, -reference, or -policy suffix",
        });
      },
    };
  },
};
