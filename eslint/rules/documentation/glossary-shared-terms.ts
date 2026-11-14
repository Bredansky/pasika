/**
 * @fileoverview Glossary entries belong in a shared reference only when
 * multiple distinct documents in the owning guide use the term.
 *
 * @see docs/documentation-guide/rules/reference-creation-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Nodes, Root } from "mdast";
import { getFilename, getTextContent } from "./helpers";
import { findDocsRoot, getProjectDocs } from "./project-index";

const LETTER_OR_NUMBER = /[\p{L}\p{N}_]/u;

function spellings(cell: string): string[] {
  const term = cell.replaceAll("\x60", "").trim();
  const suffix = /\s*\((?<short>[^()]+)\)$/u.exec(term);
  if (!suffix) return [term];
  const full = term.slice(0, suffix.index).trim();
  const abbreviation = suffix.groups?.short?.trim() ?? "";
  return [term, full, abbreviation].filter(Boolean);
}

function unfencedText(markdown: string): string {
  const lines: string[] = [];
  let fenceChar: string | undefined;
  let fenceLength = 0;
  for (const line of markdown.split(/\r?\n/u)) {
    const delimiter = /^\s*(?<fence>\x60{3,}|~{3,})/u.exec(line)?.groups?.fence;
    if (fenceChar) {
      if (delimiter?.startsWith(fenceChar) && delimiter.length >= fenceLength) {
        fenceChar = undefined;
      }
      continue;
    }
    if (delimiter) {
      fenceChar = delimiter[0];
      fenceLength = delimiter.length;
      continue;
    }
    lines.push(line);
  }
  // Links contribute their visible label, not the URL or the anchor fragment.
  return lines
    .join("\n")
    .replaceAll(/\[(?<label>[^\]]+)\]\([^)]+\)/gu, "$<label>")
    .replaceAll("\x60", "");
}

function containsTerm(content: string, value: string): boolean {
  const source = content.toLocaleLowerCase("en");
  const target = value.toLocaleLowerCase("en");
  if (!target) return false;
  let from = 0;
  for (;;) {
    const index = source.indexOf(target, from);
    if (index < 0) return false;
    from = index + 1;
    const before = source[index - 1] ?? "";
    const after = source[index + target.length] ?? "";
    if (LETTER_OR_NUMBER.test(before)) continue;
    if (!LETTER_OR_NUMBER.test(after)) return true;
    // English plural forms are common in prose around glossary terms.
    if (after === "s" && !LETTER_OR_NUMBER.test(source[index + target.length + 1] ?? "")) return true;
    if (
      source.slice(index + target.length, index + target.length + 2) === "es" &&
      !LETTER_OR_NUMBER.test(source[index + target.length + 2] ?? "")
    ) {
      return true;
    }
  }
}

interface TermCell {
  name: string;
  node: Nodes;
}

function glossaryTerms(root: Root): TermCell[] {
  const terms: TermCell[] = [];
  for (const child of root.children) {
    if (child.type !== "table") continue;
    if (
      getTextContent(child.children[0]?.children[0] ?? child)
        .trim()
        .toLowerCase() !== "term"
    ) {
      continue;
    }
    for (const row of child.children.slice(1)) {
      const cell = row.children[0];
      if (!cell) continue;
      const name = getTextContent(cell).trim();
      if (name) terms.push({ name, node: cell });
    }
  }
  if (terms.length === 0) {
    for (const child of root.children) {
      if (child.type !== "heading" || child.depth !== 2) continue;
      const name = getTextContent(child).trim();
      if (name) terms.push({ name, node: child });
    }
  }
  return terms;
}

export const glossarySharedTermsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Require each glossary term to be used in two other docs from the same guide.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const file = path.resolve(getFilename(context));
        const basename = path.basename(file);
        if (!basename.includes("glossary") || !basename.endsWith("-reference.md")) return;
        const docsRoot = findDocsRoot(file);
        if (!docsRoot) return;
        const guideRoot = path.dirname(path.dirname(file));
        const guidePrefix = `${guideRoot}${path.sep}`;
        const otherDocuments = getProjectDocs(docsRoot)
          .filter((doc) => doc.filePath.startsWith(guidePrefix) && doc.filePath !== file)
          .map((doc) => unfencedText(readFileSync(doc.filePath, "utf8")));
        for (const term of glossaryTerms(node)) {
          const names = spellings(term.name).flatMap((name) =>
            name.endsWith("y") ? [name, `${name.slice(0, -1)}ies`] : [name],
          );
          const count = otherDocuments.filter((content) => names.some((name) => containsTerm(content, name))).length;
          if (count < 2) {
            context.report({
              node: term.node,
              message: `glossary term "${term.name}" appears in ${String(count)} other documentation file(s) in its guide; a shared glossary requires at least two. See docs/documentation-guide/rules/reference-creation-rule.md`,
            });
          }
        }
      },
    };
  },
};
