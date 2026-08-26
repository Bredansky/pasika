/**
 * @fileoverview RFC 2119 vocabulary must appear only in bullet points.
 */
import type { Rule } from "eslint";
import type { Nodes, Root } from "mdast";
import { containsRfcKeyword, getFilename } from "./helpers.js";

/** Check whether a subtree contains a text node outside a bullet using RFC vocabulary. */
function checkOutsideBullets(node: Nodes, context: Rule.RuleContext, insideBullet: boolean): void {
  if (node.type === "listItem") {
    // Everything under a list item is a bullet; stop descending for the
    // outside-bullet check, but nested lists still need walking.
    for (const child of node.children) {
      checkOutsideBullets(child, context, true);
    }
    return;
  }
  if (node.type === "text") {
    const keyword = containsRfcKeyword(node.value);
    if (keyword && !insideBullet) {
      context.report({
        node,
        message: `RFC 2119 vocabulary "${keyword}" appears outside a bullet point`,
      });
    }
    return;
  }
  if ("children" in node) {
    for (const child of node.children) {
      checkOutsideBullets(child, context, insideBullet);
    }
  }
}

export const rfcOnlyInBulletsRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "RFC 2119 vocabulary must appear only in bullet points.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md")) return;

        checkOutsideBullets(node, context, false);
      },
    };
  },
};
