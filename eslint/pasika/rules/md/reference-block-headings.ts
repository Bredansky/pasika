/**
 * @fileoverview Reference block headings rule.
 * A Reference with a single lookup block must not add a section heading for it.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading, Root } from "mdast";
import { getFilename } from "./helpers";

export const referenceBlockHeadingsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Reference block headings rule.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-reference.md")) return;

        const sectionHeadings: Heading[] = [];
        for (const child of node.children) {
          if (child.type === "heading" && child.depth >= 2) {
            sectionHeadings.push(child);
          }
        }

        if (sectionHeadings.length === 1) {
          context.report({
            node: node.children[0] ?? node,
            message:
              "reference has exactly one section heading, so either a single block is headed or a first block is not",
          });
        }
      },
    };
  },
};
