/**
 * @fileoverview Each guide step must be concise and use one sentence.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { List, ListItem } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";

function countSentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((part) => part.trim() !== "").length;
}

export const guideStepSingleSentenceRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Each guide step must be concise and use one sentence.",
      recommended: true,
    },
  },
  create(context) {
    // Walked list context, tracked via enter/exit so listItem can see its
    // enclosing list without relying on a second visitor argument.
    const listsOnPath: List[] = [];
    return {
      list(node: List) {
        listsOnPath.push(node);
      },
      "list:exit"() {
        listsOnPath.pop();
      },
      listItem(node: ListItem) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        // Steps are ordered list items.
        if (!listsOnPath.at(-1)?.ordered) return;

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
