/**
 * @fileoverview A step that links another Guide must link directly to a How To section.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Link, ListItem, Nodes, Root } from "mdast";
import { getFilename } from "./helpers.js";

/** Visit every ordered-list item and run a check. */
function visitSteps(node: Nodes, check: (item: ListItem) => void): void {
  if (node.type === "list" && node.ordered) {
    for (const child of node.children) check(child);
  }
  if ("children" in node) {
    for (const child of node.children) visitSteps(child, check);
  }
}

/** Collect guide links in a subtree. */
function collectGuideLinks(node: Nodes): Link[] {
  if (node.type === "link" && node.url.endsWith("-guide.md")) return [node];
  if ("children" in node) {
    return node.children.flatMap(collectGuideLinks);
  }
  return [];
}

export const guideLinkAnchorsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "A step that links another Guide must link directly to a How To section.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        visitSteps(node, (item) => {
          for (const link of collectGuideLinks(item)) {
            // A guide link should have an anchor (#) pointing to a section.
            if (!link.url.includes("#")) {
              context.report({
                node: link,
                message: `guide link ${link.url} does not point to a specific section`,
              });
            }
          }
        });
      },
    };
  },
};
