/**
 * Helpers for markdown ESLint rules operating on @eslint/markdown's AST.
 */
import type { Nodes } from "mdast";
import type { Rule } from "eslint";

/**
 * RFC 2119 keywords matched by word-boundary regex, longest first.
 */
const RFC_PATTERN =
  /\b(?<keyword>MUST NOT|MUST|SHALL NOT|SHALL|SHOULD NOT|SHOULD|MAY|RECOMMENDED|NOT RECOMMENDED|OPTIONAL|REQUIRED)\b/;

/**
 * Check if text contains RFC 2119 vocabulary.
 * Returns the first keyword found, or null.
 */
export function containsRfcKeyword(text: string): string | null {
  const match = RFC_PATTERN.exec(text);
  return match?.groups?.keyword ?? null;
}

/**
 * Get the file path being linted.
 */
export function getFilename(context: Rule.RuleContext): string {
  return context.filename;
}

/**
 * Get the text content of an mdast node.
 */
export function getTextContent(node: Nodes): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node) {
    return node.children.map(getTextContent).join("");
  }
  return "";
}

/**
 * Get the line number from a node's position.
 */
export function getLine(node: Nodes): number {
  return node.position?.start.line ?? 0;
}
