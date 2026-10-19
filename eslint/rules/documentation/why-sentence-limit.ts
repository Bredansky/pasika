/**
 * @fileoverview Limit Why explanations in Rule examples to two sentences.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Paragraph } from "mdast";
import { getFilename, getTextContent } from "./helpers";

const MAX_SENTENCES = 2;

function sentenceCount(text: string): number {
  // Abbreviations are not sentence boundaries; dots in paths and decimals
  // are left intact because they are not followed by whitespace.
  const normalized = text.replace(/\b(?:e\.g|i\.e)\./gi, (match) => match.replaceAll(".", ""));
  return normalized.split(/[.!?]+["'’”\])]*(?:\s+|$)/).filter((part) => part.trim().length > 0).length;
}

export const whySentenceLimitRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Why explanations in Rules may use at most two sentences.",
      recommended: true,
    },
  },
  create(context) {
    return {
      paragraph(node: Paragraph) {
        if (!getFilename(context).endsWith("-rule.md")) return;
        const text = node.children
          .map((child) => (child.type === "inlineCode" ? "code" : getTextContent(child)))
          .join("")
          .trim();
        if (!text.startsWith("Why:")) return;
        const count = sentenceCount(text.slice("Why:".length).trim());
        if (count > MAX_SENTENCES) {
          context.report({
            node,
            message: `Why explanation has ${String(count)} sentences; maximum is ${String(MAX_SENTENCES)}.`,
          });
        }
      },
    };
  },
};
