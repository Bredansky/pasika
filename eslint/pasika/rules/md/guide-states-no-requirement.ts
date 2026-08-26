/**
 * @fileoverview Guide must not state requirements with RFC 2119 vocabulary.
 */
import type { Rule } from "eslint";
import type { ListItem } from "mdast";
import { containsRfcKeyword, getFilename, getTextContent } from "./helpers.js";

export const guideStatesNoRequirementRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Guide must not state requirements with RFC 2119 vocabulary.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
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
