/**
 * @fileoverview Overview must follow the title in a documentation file.
 */
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers.js";

export const overviewPresentRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Overview must follow the title in a documentation file.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        let titleLine = 0;
        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 1) {
            titleLine = getLine(child);
            break;
          }
        }

        if (!titleLine) return;

        let hasOverview = false;
        for (const child of node.children) {
          if (child.type === "paragraph" && getLine(child) > titleLine && getTextContent(child).trim()) {
            hasOverview = true;
            break;
          }
        }

        if (!hasOverview) {
          context.report({
            node,
            message: "no overview follows the title",
          });
        }
      },
    };
  },
};
