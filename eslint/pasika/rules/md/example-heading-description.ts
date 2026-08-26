/**
 * @fileoverview Example headings must have an em-dash description.
 */
import type { Rule } from "eslint";
import type { Heading } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";

export const exampleHeadingDescriptionRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Example headings must have an em-dash description.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
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
