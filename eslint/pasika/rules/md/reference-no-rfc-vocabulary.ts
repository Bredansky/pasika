/**
 * @fileoverview Reference documents must not use RFC 2119 vocabulary in prose.
 * Only naming a keyword in code spans is permitted.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Text } from "mdast";
import { containsRfcKeyword, getFilename } from "./helpers";

export const referenceNoRfcVocabularyRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Reference documents must not use RFC 2119 vocabulary (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY) in prose.",
      recommended: true,
    },
  },
  create(context) {
    return {
      text(node: Text) {
        const filename = getFilename(context);
        if (!filename.endsWith("-reference.md")) return;

        const keyword = containsRfcKeyword(node.value);
        if (keyword) {
          context.report({
            node,
            message: `reference uses RFC 2119 vocabulary: ${keyword}`,
          });
        }
      },
    };
  },
};
