/**
 * @fileoverview A Guide entry point must reference each owned Rule from within
 * a How To step, mention every owned Reference, and never link a missing file.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Link, ListItem, Nodes, Root } from "mdast";
import { getFilename } from "./helpers";
import { findDocsRoot, getProjectDocs } from "./project-index";

/** Visit every ordered-list item (a How To step) and run a check. */
function visitSteps(node: Nodes, check: (item: ListItem) => void): void {
  if (node.type === "list" && node.ordered) {
    for (const child of node.children) check(child);
  }
  if ("children" in node) {
    for (const child of node.children) visitSteps(child, check);
  }
}

/** Collect every markdown link in a subtree. */
function collectMarkdownLinks(node: Nodes, out: Link[]): void {
  if (node.type === "link" && node.url.endsWith(".md")) out.push(node);
  if ("children" in node) {
    for (const child of node.children) collectMarkdownLinks(child, out);
  }
}

/** The path part of a link URL, with any `#fragment` stripped. */
function linkTarget(url: string): string {
  return url.split("#")[0] ?? url;
}

export const guideMentionsDocumentsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A Guide entry point must reference each owned Rule from a How To step, mention every Reference, and not link a missing document.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-guide.md")) return;

        const docsRoot = findDocsRoot(filename);
        if (!docsRoot) return;

        const guideDir = path.dirname(filename);
        // Only the folder's entry point (name matches its folder) must mention
        // every owned document; review guides and index documents are exempt.
        if (path.basename(filename, ".md") !== path.basename(guideDir)) return;

        const docs = getProjectDocs(docsRoot);
        // Documents this guide owns: the rules/ and references/ subfolders.
        const owned = docs.filter((doc) => {
          const parent = path.dirname(doc.filePath);
          return parent === path.join(guideDir, "rules") || parent === path.join(guideDir, "references");
        });

        const allLinks: Link[] = [];
        collectMarkdownLinks(node, allLinks);

        // The guide's own rules must be referenced from within How To steps.
        const stepLinks: Link[] = [];
        visitSteps(node, (item) => {
          collectMarkdownLinks(item, stepLinks);
        });

        const mentionsOf = (links: Link[], fileName: string): boolean =>
          links.some((link) => link.url.split("/").pop() === fileName);

        for (const doc of owned) {
          if (doc.kind === "rule") {
            if (!mentionsOf(stepLinks, doc.fileName)) {
              context.report({
                node,
                message: `Guide entry point does not reference a Rule it owns from a How To step: ${doc.doc}`,
              });
            }
          } else if (!mentionsOf(allLinks, doc.fileName)) {
            context.report({
              node,
              message: `Guide entry point does not mention a document it owns: ${doc.doc}`,
            });
          }
        }

        for (const link of allLinks) {
          const target = linkTarget(link.url);
          if (!target.endsWith(".md")) continue;
          const resolved = path.normalize(path.join(guideDir, target));
          if (!existsSync(resolved)) {
            context.report({
              node: link,
              message: `Guide links a document that does not exist: ${link.url}`,
            });
          }
        }
      },
    };
  },
};
