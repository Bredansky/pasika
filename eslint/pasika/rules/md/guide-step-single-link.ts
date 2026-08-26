/**
 * @fileoverview Each guide step must link at most one document total.
 */
import type { Rule } from "eslint";
import type { ListItem, Nodes, Root } from "mdast";
import { getFilename } from "./helpers.js";

/** Count document links in a subtree. */
function countDocLinks(node: Nodes): number {
  if (node.type === "link" && node.url.endsWith(".md")) return 1;
  if ("children" in node) {
    return node.children.reduce((sum, child) => sum + countDocLinks(child), 0);
  }
  return 0;
}

/** Visit every ordered-list item and run a check. */
function visitSteps(node: Nodes, check: (item: ListItem) => void): void {
  if (node.type === "list" && node.ordered) {
    for (const child of node.children) check(child);
  }
  if ("children" in node) {
    for (const child of node.children) visitSteps(child, check);
  }
}

export const guideStepSingleLinkRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Each guide step must link at most one document total.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        visitSteps(node, (item) => {
          const links = countDocLinks(item);
          if (links > 1) {
            context.report({
              node: item,
              message: `step links ${String(links)} documents`,
            });
          }
        });
      },
    };
  },
};
