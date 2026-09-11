/**
 * @fileoverview Reference max heading depth rule.
 * A Reference must not use a heading deeper than level 2.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";
import { getFilename } from "./helpers";

export const referenceMaxHeadingDepthRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Reference max heading depth rule.",
      recommended: true,
    },
  },
  create(context) {
    return {
      heading(node: Heading) {
        const filename = getFilename(context);
        if (!filename.endsWith("-reference.md")) return;
        if (node.depth <= 2) return;

        context.report({
          node,
          message: "reference heading is deeper than level 2; flatten it into the section it would nest under",
        });
      },
    };
  },
};
