/**
 * @fileoverview Document and Guide section overviews must exist, contain at
 * most two sentences, and not link to other documents.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Nodes, Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers";

function countSentences(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((part) => part.trim() !== "").length;
}

function containsLink(node: Nodes): boolean {
  if (node.type === "link") return true;
  if ("children" in node) {
    return node.children.some(containsLink);
  }
  return false;
}

export const overviewRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Document and Guide section overviews must exist, contain at most two sentences, and not link to other documents.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        let titleLine = 0;
        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 1) {
            titleLine = getLine(child);
            break;
          }
        }
        if (!titleLine) return;

        // The overview is every paragraph between the title and the first
        // sub-heading. Count sentences across all of them so a second paragraph
        // cannot smuggle extra sentences past the limit.
        let sentenceCount = 0;
        let found = false;
        for (const child of node.children) {
          if (child.type === "heading" && getLine(child) > titleLine) break;
          if (child.type !== "paragraph" || getLine(child) <= titleLine) continue;
          const text = getTextContent(child).trim();
          if (!text || text.startsWith("#")) continue;

          found = true;
          if (containsLink(child)) {
            context.report({
              node: child,
              message: "overview links another document",
            });
          }

          sentenceCount += countSentences(text);
          if (sentenceCount > 2) {
            context.report({
              node: child,
              message: `overview uses ${String(sentenceCount)} sentences, at most two are allowed`,
            });
            break;
          }
        }

        if (!found) {
          context.report({ node, message: "no overview follows the title" });
        }

        if (!filename.endsWith("-guide.md")) return;

        for (const [index, child] of node.children.entries()) {
          if (child.type !== "heading" || child.depth !== 2) continue;
          const title = getTextContent(child).trim();
          if (!/^How To \S/.test(title)) continue;

          const overview = node.children[index + 1];
          if (overview?.type !== "paragraph") {
            context.report({
              node: child,
              message: `no overview follows guide section "${title}"`,
            });
            continue;
          }

          if (containsLink(overview)) {
            context.report({
              node: overview,
              message: `overview of guide section "${title}" links another document`,
            });
          }

          const sectionSentenceCount = countSentences(getTextContent(overview).trim());
          if (sectionSentenceCount > 2) {
            context.report({
              node: overview,
              message: `overview of guide section "${title}" uses ${String(sectionSentenceCount)} sentences, at most two are allowed`,
            });
          }
        }
      },
    };
  },
};
