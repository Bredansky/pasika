/**
 * @fileoverview Example headings must have an em-dash description.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";
import { getFilename, getTextContent } from "./helpers";

export const exampleHeadingDescriptionRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Example headings must have an em-dash description.",
      recommended: true,
    },
  },
  create(context) {
    return {
      heading(node: Heading) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md")) return;
        if (node.depth !== 2) return;

        const text = getTextContent(node).trim();
        if (!/^(?:Incorrect|Correct)\b/.test(text)) return;

        if (!/^(?:Incorrect|Correct) — .+/.test(text)) {
          context.report({
            node,
            message: `example heading has no em-dash description: ${text}`,
          });
        }
      },
    };
  },
};
