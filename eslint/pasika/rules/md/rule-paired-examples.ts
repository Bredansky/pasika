/**
 * @fileoverview Rule must have paired Incorrect/Correct examples.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers";

export const rulePairedExamplesRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Rule must have paired Incorrect/Correct examples.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md")) return;

        const exampleHeadings: { line: number; text: string }[] = [];

        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 2) {
            const text = getTextContent(child).trim();
            if (/^(?:Incorrect|Correct)\b/.test(text)) {
              exampleHeadings.push({ line: getLine(child), text });
            }
          }
        }

        const incorrect = exampleHeadings.filter((h) => h.text.startsWith("Incorrect"));
        const correct = exampleHeadings.filter((h) => h.text.startsWith("Correct"));

        if (incorrect.length === 0 || incorrect.length !== correct.length) {
          context.report({
            node,
            message: `${String(incorrect.length)} Incorrect and ${String(correct.length)} Correct examples`,
          });
        }
      },
    };
  },
};
