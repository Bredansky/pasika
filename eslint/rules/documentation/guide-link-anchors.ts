/**
 * @fileoverview A step that links another Guide must link directly to a How To
 * section, and a link that carries an anchor must point at a heading the linked
 * document has.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Link, ListItem, Nodes, Root } from "mdast";
import { getFilename, isDocLink, linkTarget } from "./helpers";

/** Visit every ordered-list item and run a check. */
function visitSteps(node: Nodes, check: (item: ListItem) => void): void {
  if (node.type === "list" && node.ordered) {
    for (const child of node.children) check(child);
  }
  if ("children" in node) {
    for (const child of node.children) visitSteps(child, check);
  }
}

/** Collect guide links in a subtree, anchored or not. */
function collectGuideLinks(node: Nodes): Link[] {
  if (node.type === "link" && linkTarget(node.url).endsWith("-guide.md")) return [node];
  if ("children" in node) {
    return node.children.flatMap(collectGuideLinks);
  }
  return [];
}

/** Collect every Markdown link in a subtree. */
function collectLinks(node: Nodes, out: Link[]): void {
  if (node.type === "link") out.push(node);
  if ("children" in node) {
    for (const child of node.children) collectLinks(child, out);
  }
}

/** The anchor a heading's text produces, the way a Markdown renderer slugs it. */
function headingAnchor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s-]/gu, "")
    .replaceAll(/\s+/g, "-");
}

const anchorsByFile = new Map<string, Set<string>>();

/**
 * Every anchor a document's headings produce, with a `-1` suffix for a repeated
 * heading. Fenced code is skipped, so a heading quoted inside an example does
 * not offer an anchor the document never renders.
 */
function documentAnchors(filePath: string): Set<string> {
  const cached = anchorsByFile.get(filePath);
  if (cached) return cached;

  const anchors = new Set<string>();
  anchorsByFile.set(filePath, anchors);

  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return anchors;
  }

  const seen = new Map<string, number>();
  let fenced = false;

  for (const line of content.split("\n")) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = /^#{1,6}\s+(?<text>.+)$/.exec(line)?.groups?.text;
    if (!heading) continue;

    const base = headingAnchor(heading);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${String(count)}`);
  }

  return anchors;
}

export const guideLinkAnchorsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A step that links another Guide must link directly to a How To section, and a link that carries an anchor must point at a heading the linked document has.",
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

        const links: Link[] = [];
        collectLinks(node, links);

        for (const link of links) {
          // Only this repository's own Markdown documents resolve, and only a
          // fragment claims a heading.
          const [target = "", fragment = ""] = link.url.split("#");
          if (!fragment || !isDocLink(link.url)) continue;

          const targetPath = path.resolve(path.dirname(filename), target);
          // A document that is not there is guide-mentions-documents' report.
          if (!existsSync(targetPath)) continue;

          if (documentAnchors(targetPath).has(fragment.toLowerCase())) continue;

          context.report({
            node: link,
            message: `link ${link.url} points at a heading the document does not have`,
          });
        }
      },
    };
  },
};
