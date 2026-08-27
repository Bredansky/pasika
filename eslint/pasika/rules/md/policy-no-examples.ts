/**
 * @fileoverview Policy document must not contain Incorrect/Correct examples.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";

export const policyNoExamplesRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Policy document must not contain Incorrect/Correct examples.",
      recommended: true,
    },
  },
  create(context) {
    return {
      heading(node: Heading) {
        const filename = getFilename(context);
        if (!filename.endsWith("-policy.md")) return;
        if (node.depth !== 2) return;

        const text = getTextContent(node).trim();
        if (/^(?:Incorrect|Correct)\b/.test(text)) {
          context.report({
            node,
            message: `policy document contains an example: ${text}`,
          });
        }
      },
    };
  },
};
