/**
 * @fileoverview Every bullet in a rule or policy document must carry an RFC 2119 keyword.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Nodes, Root } from "mdast";
import { containsRfcKeyword, getFilename, getTextContent } from "./helpers";

/** Report every list item whose text carries no RFC 2119 keyword. */
function checkBullets(node: Nodes, context: { report: (descriptor: { node: Nodes; message: string }) => void }): void {
  if (node.type === "listItem" && !containsRfcKeyword(getTextContent(node))) {
    context.report({
      node,
      message: "bullet point contains no RFC 2119 keyword",
    });
  }
  if ("children" in node) {
    for (const child of node.children) {
      checkBullets(child, context);
    }
  }
}

export const rfcKeywordInEveryBulletRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Every bullet in a rule or policy document must contain an RFC 2119 keyword.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md") && !filename.endsWith("-policy.md")) return;

        checkBullets(node, context);
      },
    };
  },
};
