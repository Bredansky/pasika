/**
 * @fileoverview Rule and policy documents must state at least one requirement.
 */
import type { Rule } from "eslint";
import type { Nodes, Root } from "mdast";
import { containsRfcKeyword, getFilename, getTextContent } from "./helpers.js";

/** Check whether a subtree contains a bullet with RFC vocabulary. */
function hasRequirement(node: Nodes): boolean {
  if (node.type === "listItem") {
    if (containsRfcKeyword(getTextContent(node))) return true;
  }
  if ("children" in node) {
    for (const child of node.children) {
      if (hasRequirement(child)) return true;
    }
  }
  return false;
}

export const requirementPresentRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Rule and policy documents must state at least one requirement.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md") && !filename.endsWith("-policy.md")) {
          return;
        }

        if (!hasRequirement(node)) {
          const kind = filename.endsWith("-rule.md") ? "rule" : "policy";
          context.report({
            node,
            message: `${kind} document states no requirement`,
          });
        }
      },
    };
  },
};
