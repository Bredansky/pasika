/**
 * @fileoverview A How To section whose steps use terms that a glossary
 * Reference defines must link that Reference from the section's first step, and
 * every lookup block of that glossary must be anchored by one of them, so a
 * split belongs to a workflow rather than to an author's taxonomy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading, Nodes, Root } from "mdast";
import { getFilename, getTextContent, headingAnchor, isDocLink, linkTarget } from "./helpers";
import { findDocsRoot, getProjectDocs } from "./project-index";

/** Whether a reference document is the guide's glossary, the only kind that defines terms. */
function isGlossary(filePath: string): boolean {
  return path.basename(filePath).includes("glossary");
}

/** The first cell of every table row that is not a header or separator. */
function extractTableTerms(content: string): string[] {
  const terms: string[] = [];
  const rowPattern = /^\|(?<cell>[^|]*)\|/gm;

  for (const match of content.matchAll(rowPattern)) {
    const cell = match.groups?.cell?.trim() ?? "";
    if (!cell || /^:?-+:?$/.test(cell) || cell.toLowerCase() === "term") continue;
    terms.push(cell);
  }

  return terms;
}

/**
 * Extract the terms a glossary Reference defines, and nothing from a reference
 * that is not a glossary. A glossary that defines its terms in tables — grouped
 * under `## <Group> Terms` headings — contributes the term column of those
 * tables; one without tables falls back to its `## Term` headings.
 */
function extractGlossaryTerms(filePath: string): string[] {
  if (!isGlossary(filePath)) return [];

  const content = readFileSync(filePath, "utf8");
  const tableTerms = extractTableTerms(content);
  if (tableTerms.length > 0) return tableTerms;

  const terms: string[] = [];
  const headingPattern = /^## (?<term>.+)$/gm;

  for (const match of content.matchAll(headingPattern)) {
    const term = match.groups?.term?.trim();
    if (term) terms.push(term);
  }

  return terms;
}

/**
 * The block headings a glossary groups its tables under. A glossary that keeps
 * one table has none, which is what its single block requires.
 */
function extractBlockHeadings(filePath: string): string[] {
  const headings: string[] = [];
  let fenced = false;

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = /^##\s+(?<text>.+)$/.exec(line)?.groups?.text;
    if (heading) headings.push(heading.trim());
  }

  return headings;
}

/**
 * Term matching ignores code spans and case, so a step that names a term in
 * prose — "a tracked doc" for the `Tracked doc` entry — still counts.
 */
function normalize(text: string): string {
  return text.replaceAll("`", "").toLowerCase();
}

interface GuideSection {
  heading: Heading;
  title: string;
  /** Every step in the section, in order. */
  stepTexts: string[];
  /** The documents the section's first step links. */
  firstStepLinks: string[];
}

/** Collect every How To section with its steps, so each one is checked on its own. */
function collectSections(node: Root): GuideSection[] {
  const sections: GuideSection[] = [];
  const children = node.children;

  for (const [index, child] of children.entries()) {
    if (child.type !== "heading" || child.depth !== 2) continue;

    const title = getTextContent(child).trim();
    if (!/^How To \S/.test(title)) continue;

    // A level-two heading of any kind ends the section, so a section's content
    // is exactly what sits between its heading and the next one.
    const end = children.findIndex(
      (sibling, siblingIndex) => siblingIndex > index && sibling.type === "heading" && sibling.depth === 2,
    );
    const section: GuideSection = { heading: child, title, stepTexts: [], firstStepLinks: [] };
    collectSteps(children.slice(index + 1, end === -1 ? children.length : end), section);
    sections.push(section);
  }

  return sections;
}

/**
 * Add a section's steps, keeping the first one's document links. Steps are the
 * items of its lists however they are marked, so bulleted and numbered lists
 * read the same; a section that writes no list keeps them as prose, the
 * paragraph after its overview being the first.
 */
function collectSteps(content: Nodes[], section: GuideSection): void {
  const lists = content.filter((node) => node.type === "list");
  const paragraphs = content.filter((node) => node.type === "paragraph");
  const steps: Nodes[] =
    lists.length > 0
      ? lists.flatMap((list) => list.children)
      : paragraphs.slice(content[0]?.type === "paragraph" ? 1 : 0);

  for (const step of steps) {
    section.stepTexts.push(getTextContent(step));
    if (section.stepTexts.length === 1) collectDocLinks(step, section.firstStepLinks);
  }
}

function collectDocLinks(node: Nodes, out: string[]): void {
  if (node.type === "link" && isDocLink(node.url)) out.push(node.url);
  if ("children" in node) {
    for (const child of node.children) collectDocLinks(child, out);
  }
}

export const glossaryTermLinkingRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A How To section whose steps use glossary terms must link that Reference from the first step, and every block of that glossary must be anchored by one of them.",
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

        const docs = getProjectDocs(docsRoot);
        const guideDir = path.dirname(filename);
        const referencesDir = path.join(guideDir, "references");

        // The reference documents owned by this guide, and the glossary among them.
        const guideReferences = docs.filter(
          (doc) => doc.kind === "reference" && path.dirname(doc.filePath) === referencesDir,
        );
        const glossaryReferences = guideReferences.filter((doc) => isGlossary(doc.filePath));

        if (glossaryReferences.length === 0) return;

        const glossaryTerms: string[] = [];
        for (const ref of glossaryReferences) {
          glossaryTerms.push(...extractGlossaryTerms(ref.filePath));
        }

        if (glossaryTerms.length === 0) return;

        const sections = collectSections(node);

        // Every block a glossary is split into has to be read by a section, so
        // a group with no owning workflow is reported where it is declared.
        for (const ref of glossaryReferences) {
          for (const heading of extractBlockHeadings(ref.filePath)) {
            const anchor = headingAnchor(heading);
            const anchored = sections.some((section) =>
              section.firstStepLinks.some((link) => {
                const fragment = link.split("#")[1] ?? "";
                if (fragment.toLowerCase() !== anchor) return false;
                return path.resolve(guideDir, linkTarget(link)) === path.resolve(ref.filePath);
              }),
            );

            if (!anchored) {
              context.report({
                node,
                message: `glossary block "${heading}" is anchored by no How To section's first step`,
              });
            }
          }
        }

        for (const section of sections) {
          const normalizedStepTexts = section.stepTexts.map(normalize);
          const usedTerms = glossaryTerms.filter((term) => {
            const needle = normalize(term);
            return normalizedStepTexts.some((text) => text.includes(needle));
          });

          if (usedTerms.length === 0) continue;

          // The link has to be the glossary itself, in the section's own first step.
          const hasGlossaryLink = section.firstStepLinks.some((link) =>
            glossaryReferences.some((ref) => link.includes(ref.fileName)),
          );

          if (!hasGlossaryLink) {
            context.report({
              node: section.heading,
              message: `guide section "${section.title}" uses glossary terms (${usedTerms.join(", ")}) but its first step does not link the glossary reference`,
            });
          }
        }
      },
    };
  },
};
