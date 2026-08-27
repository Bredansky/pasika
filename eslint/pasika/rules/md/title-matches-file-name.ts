/**
 * @fileoverview Document title must match the file name in kebab-case.
 */
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";

function toExpectedFileName(title: string): string {
  return `${title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.md`;
}

export const titleMatchesFileNameRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Document title must match the file name in kebab-case.",
      recommended: true,
    },
  },
  create(context) {
    return {
      heading(node: Heading) {
        if (node.depth !== 1) return;

        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        const title = getTextContent(node).trim();
        const expectedFileName = toExpectedFileName(title);
        const actualFileName = path.basename(filename);

        if (!title) {
          context.report({
            node,
            message: "document has no `# Title` heading",
          });
        } else if (expectedFileName !== actualFileName) {
          context.report({
            node,
            message: `title "${title}" expects file name ${expectedFileName}`,
          });
        }
      },
    };
  },
};
