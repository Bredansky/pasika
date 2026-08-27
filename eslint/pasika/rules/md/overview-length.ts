/**
 * @fileoverview Overview must contain at most two sentences.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers.js";

function countSentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((part) => part.trim() !== "").length;
}

export const overviewLengthRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Overview must contain at most two sentences.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        let titleLine = 0;
        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 1) {
            titleLine = getLine(child);
            break;
          }
        }

        if (!titleLine) return;

        // Check only the first content paragraph after the title (the overview).
        for (const child of node.children) {
          if (child.type !== "paragraph" || getLine(child) <= titleLine) continue;
          const text = getTextContent(child).trim();
          if (!text || text.startsWith("#")) continue;

          const sentenceCount = countSentences(text);
          if (sentenceCount > 2) {
            context.report({
              node: child,
              message: `overview uses ${String(sentenceCount)} sentences, at most two are allowed`,
            });
          }
          break;
        }
      },
    };
  },
};
