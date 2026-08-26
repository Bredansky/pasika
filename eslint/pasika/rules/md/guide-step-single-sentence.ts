/**
 * @fileoverview Each guide step must be concise and use one sentence.
 */
import type { Rule } from "eslint";
import type { List, ListItem } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";

function countSentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((part) => part.trim() !== "").length;
}

export const guideStepSingleSentenceRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Each guide step must be concise and use one sentence.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      listItem(node: ListItem, parent?: List) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        // Steps are ordered list items.
        if (!parent?.ordered) return;

        const text = getTextContent(node).trim();
        const sentenceCount = countSentences(text);

        if (sentenceCount > 1) {
          context.report({
            node,
            message: `step uses ${String(sentenceCount)} sentences`,
          });
        }
      },
    };
  },
};
