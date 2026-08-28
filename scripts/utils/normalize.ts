import { createHash } from "node:crypto";

/**
 * Reduces a requirement bullet to the text its meaning depends on.
 *
 * Markdown links collapse to their link text and code spans lose their
 * backticks, so editing a URL or adding backticks does not read as a change in
 * what the requirement demands. Whitespace collapses so re-wrapping a long
 * bullet is not a change either.
 */
export function normalizeRequirement(bullet: string): string {
  return bullet
    .replace(/^\s*[-*]\s+/, "")
    .replaceAll(/\[(?<text>[^\]]+)\]\([^)]*\)/g, "$<text>")
    .replaceAll("`", "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/** Short, stable fingerprint of a canonical requirement text. */
export function hashRequirement(canonicalText: string): string {
  return createHash("sha256").update(canonicalText).digest("hex").slice(0, 10);
}
