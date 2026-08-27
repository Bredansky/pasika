/**
 * @fileoverview A Guide whose steps use terms that a glossary Reference defines
 * must link that Reference from its first step.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Nodes, Root } from "mdast";
import { getFilename, getTextContent } from "./helpers.js";
import { findDocsRoot, getProjectDocs } from "./project-index.js";

/** Extract glossary terms from a reference document. */
function extractGlossaryTerms(filePath: string): string[] {
  const content = readFileSync(filePath, "utf8");
  const terms: string[] = [];

  // Look for definition-style patterns: "## Term" headings
  const headingPattern = /^## (?<term>.+)$/gm;
  let match;
  while ((match = headingPattern.exec(content)) !== null) {
    const term = match.groups?.term?.trim();
    if (term) terms.push(term);
  }

  return terms;
}

/** Collect the text of every step, and the doc links of the first step. */
function collectSteps(node: Nodes): { texts: string[]; firstStepLinks: string[] } {
  const texts: string[] = [];
  const firstStepLinks: string[] = [];

  if (node.type === "list" && node.ordered) {
    for (const item of node.children) {
      texts.push(getTextContent(item));
      if (firstStepLinks.length === 0) {
        collectDocLinks(item, firstStepLinks);
      }
    }
  }
  if ("children" in node) {
    for (const child of node.children) {
      const nested = collectSteps(child);
      texts.push(...nested.texts);
      if (firstStepLinks.length === 0) firstStepLinks.push(...nested.firstStepLinks);
    }
  }
  return { texts, firstStepLinks };
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
      description: "A Guide whose steps use glossary terms must link that Reference from its first step.",
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

        // Find reference documents owned by this guide
        const guideReferences = docs.filter(
          (doc) => doc.kind === "reference" && path.dirname(doc.filePath) === guideDir,
        );

        if (guideReferences.length === 0) return;

        // Collect glossary terms from owned references
        const glossaryTerms: string[] = [];
        for (const ref of guideReferences) {
          glossaryTerms.push(...extractGlossaryTerms(ref.filePath));
        }

        if (glossaryTerms.length === 0) return;

        const { texts: stepTexts, firstStepLinks } = collectSteps(node);

        // Check if any step uses glossary terms
        const usedTerms = glossaryTerms.filter((term) => stepTexts.some((text) => text.includes(term)));

        if (usedTerms.length === 0) return;

        // Check if the first step links to any owned reference
        const hasRefLink = firstStepLinks.some((link) => guideReferences.some((ref) => link.includes(ref.fileName)));

        if (!hasRefLink) {
          context.report({
            node,
            message: `guide uses glossary terms (${usedTerms.join(", ")}) but first step does not link the reference`,
          });
        }
      },
    };
  },
};
