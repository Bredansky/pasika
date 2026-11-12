/**
 * @fileoverview Guides may link to Rules only when the Rule belongs to the
 * same guide folder. Other kinds of cross-guide links remain allowed.
 *
 * @see docs/documentation-guide/rules/guide-creation-rule.md
 */
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Link } from "mdast";
import { getFilename, linkTarget } from "./helpers";

export const guideRuleOwnershipRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "A Guide must not link to a Rule outside its own rules/ folder.",
      recommended: true,
    },
  },
  create(context) {
    const filename = getFilename(context);
    if (!filename.endsWith("-guide.md")) return {};

    const guideDir = path.dirname(filename);
    const ownedRulesDir = path.resolve(guideDir, "rules");

    return {
      link(node: Link) {
        const target = linkTarget(node.url);
        if (!target.endsWith("-rule.md") || /^[a-z][a-z\d+.-]*:/i.test(target)) return;

        const destination = path.resolve(guideDir, target);
        if (path.dirname(destination) !== ownedRulesDir) {
          context.report({
            node,
            message: `Guide links a Rule outside its own rules/ folder: ${node.url}`,
          });
        }
      },
    };
  },
};
