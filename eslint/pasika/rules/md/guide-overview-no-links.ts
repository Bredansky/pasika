/**
 * @fileoverview Guide overview must not link to other documents.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Nodes, Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers.js";

function containsLink(node: Nodes): boolean {
  if (node.type === "link") return true;
  if ("children" in node) {
    return node.children.some(containsLink);
  }
  return false;
}

export const guideOverviewNoLinksRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Guide overview must not link to other documents.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        let titleLine = 0;
        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 1) {
            titleLine = getLine(child);
            break;
          }
        }

        if (!titleLine) return;

        // Find the first content paragraph after the title (the overview).
        for (const child of node.children) {
          if (child.type !== "paragraph" || getLine(child) <= titleLine) continue;
          const text = getTextContent(child).trim();
          if (!text || text.startsWith("#")) continue;

          if (containsLink(child)) {
            context.report({
              node: child,
              message: "guide overview links another document",
            });
          }
          break;
        }
      },
    };
  },
};
