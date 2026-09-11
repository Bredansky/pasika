/**
 * @fileoverview A How To section whose steps use terms that a glossary
 * Reference defines must link that Reference from the section's first step.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading, Nodes, Root } from "mdast";
import { getFilename, getTextContent } from "./helpers";
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
  let current: GuideSection | undefined;

  for (const child of node.children) {
    if (child.type === "heading" && child.depth === 2) {
      const title = getTextContent(child).trim();
      current = /^How To \S/.test(title) ? { heading: child, title, stepTexts: [], firstStepLinks: [] } : undefined;
      if (current) sections.push(current);
      continue;
    }

    if (current) collectSteps(child, current);
  }

  return sections;
}

/** Add the ordered-list items under a section, keeping the first step's doc links. */
function collectSteps(node: Nodes, section: GuideSection): void {
  if (node.type === "list" && node.ordered) {
    for (const item of node.children) {
      section.stepTexts.push(getTextContent(item));
      if (section.stepTexts.length === 1) collectDocLinks(item, section.firstStepLinks);
    }
  }
  if ("children" in node) {
    for (const child of node.children) collectSteps(child, section);
  }
}

function collectDocLinks(node: Nodes, out: string[]): void {
  if (node.type === "link" && node.url.endsWith(".md")) out.push(node.url);
  if ("children" in node) {
    for (const child of node.children) collectDocLinks(child, out);
  }
}

export const glossaryTermLinkingRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A How To section whose steps use glossary terms must link that Reference from the section's first step.",
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

        for (const section of collectSections(node)) {
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
