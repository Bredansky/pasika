/**
 * @fileoverview Guide must not state requirements with RFC 2119 vocabulary.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { ListItem } from "mdast";
import { containsRfcKeyword, getFilename, getTextContent } from "./helpers";

export const guideStatesNoRequirementRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Guide must not state requirements with RFC 2119 vocabulary.",
      recommended: true,
    },
  },
  create(context) {
    return {
      listItem(node: ListItem) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        const text = getTextContent(node);
        if (containsRfcKeyword(text)) {
          context.report({
            node,
            message: "guide states a requirement with RFC 2119 vocabulary",
          });
        }
      },
    };
  },
};
