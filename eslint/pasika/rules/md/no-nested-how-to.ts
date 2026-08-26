/**
 * @fileoverview How To sections must not nest inside other How To sections.
 */
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers.js";

export const noNestedHowToRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "How To sections must not nest inside other How To sections.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        const howToHeadings: { line: number; depth: number; text: string }[] = [];

        for (const child of node.children) {
          if (child.type !== "heading") continue;
          const text = getTextContent(child).trim();
          if (!/^How To\b/.test(text)) continue;
          howToHeadings.push({ line: getLine(child), depth: child.depth, text });
        }

        // A How To heading at greater depth than the previous How To heading nests inside it.
        for (let i = 1; i < howToHeadings.length; i++) {
          const prev = howToHeadings[i - 1];
          const current = howToHeadings[i];

          if (prev && current && current.depth > prev.depth) {
            context.report({
              node,
              message: `How To section "${current.text}" nests inside another How To section`,
            });
          }
        }
      },
    };
  },
};
