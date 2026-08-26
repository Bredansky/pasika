/**
 * @fileoverview Policy document must group its bullets under a heading per subject.
 */
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename, getLine } from "./helpers.js";

export const policySubjectHeadingsRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Policy document must group its bullets under a heading per subject.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-policy.md")) return;

        // Collect headings and list items with their line numbers, in document order.
        let titleLine = 0;
        let firstSubjectLine = 0;
        let overviewLine = 0;
        let foundTitle = false;
        let foundOverview = false;

        for (const child of node.children) {
          const line = getLine(child);
          if (!foundTitle && child.type === "heading" && child.depth === 1) {
            titleLine = line;
            foundTitle = true;
            continue;
          }
          if (!foundTitle) continue;
          if (!foundOverview && child.type === "paragraph" && line > titleLine) {
            overviewLine = line;
            foundOverview = true;
            continue;
          }
          if (!firstSubjectLine && child.type === "heading" && child.depth === 2 && line > titleLine) {
            firstSubjectLine = line;
          }
        }

        if (!titleLine || !firstSubjectLine) return;

        // Any bullet before the first subject heading (and after the overview) is ungrouped.
        const hasUngroupedBullet = node.children.some((child) => {
          if (child.type !== "list") return false;
          const line = getLine(child);
          return line > overviewLine && line < firstSubjectLine;
        });

        if (hasUngroupedBullet) {
          context.report({
            node,
            message: "policy bullet appears before the first subject heading",
          });
        }
      },
    };
  },
};
