/**
 * ESLint rule: pasika/stylesheet-ordering
 *
 * The global stylesheet MUST order imports, @custom-variant definitions, :root
 * variables, @theme definitions, custom utilities, base styles, and keyframes.
 * A standalone --*: initial reset may follow the Tailwind import before feature
 * stylesheet imports, without erasing their later @theme tokens.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate } from "@eslint/css-tree";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { blockChildren, preludeIdentifiers, selectorNames } from "./helpers";

const SECTION_ORDER = ["imports", "custom-variant", "root", "theme", "utility", "base styles", "keyframes"] as const;
const LATE_RESET_ERROR =
  "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.";

/** Read only the top-level @theme body, ignoring comments in its declaration test. */
function themeBody(node: CssNodePlain, source: string): string | undefined {
  if (node.type !== "Atrule" || node.name !== "theme" || !node.loc) return undefined;
  const raw = source.slice(node.loc.start.offset, node.loc.end.offset);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  return raw
    .slice(start + 1, end)
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .trim();
}

function containsThemeReset(body: string | undefined): boolean {
  return body !== undefined && /(?:^|[;{])\s*--\*\s*:\s*initial\s*(?:;|$)/u.test(body);
}

function isStandaloneThemeReset(body: string | undefined): boolean {
  return body !== undefined && /^--\*\s*:\s*initial\s*;?$/u.test(body);
}

function isTailwindImport(node: CssNodePlain): boolean {
  if (node.type !== "Atrule" || node.name !== "import" || !node.prelude) return false;
  return /^["']tailwindcss["'](?:\s|$)/u.test(generate(node.prelude).trim());
}

function scopesCustomProperties(node: CssNodePlain): boolean {
  if (node.type === "Declaration") return node.property.startsWith("--");
  if (node.type === "Atrule" && !["media", "supports", "container"].includes(node.name)) return false;
  if (node.type !== "Atrule" && node.type !== "Rule") return false;
  return blockChildren(node).some(scopesCustomProperties);
}

export const stylesheetOrderingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the global stylesheet sections in the documented order.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const entryPoint = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    if (path.normalize(path.resolve(context.filename)) !== entryPoint) return {};
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // Map each top-level child to its section name.
        const sections: { name: string; at?: number }[] = [];
        let index = 0;
        let sawTailwindImport = false;
        let sawFeatureImport = false;
        let sawNonImport = false;
        let sawEarlyReset = false;
        for (const child of node.children) {
          const body = themeBody(child, context.sourceCode.text);
          let isEarlyReset = false;
          if (containsThemeReset(body) && sawFeatureImport) {
            context.report({ node: child, message: LATE_RESET_ERROR });
            return;
          }
          if (child.type === "Atrule" && child.name === "import") {
            sections.push({ name: "imports", at: index });
            if (isTailwindImport(child)) sawTailwindImport = true;
            else sawFeatureImport = true;
          } else if (
            isStandaloneThemeReset(body) &&
            sawTailwindImport &&
            !sawFeatureImport &&
            !sawNonImport &&
            !sawEarlyReset
          ) {
            // This reset must precede the imported feature @theme declarations.
            // It is the only permitted exception to the imports-first order.
            sawEarlyReset = true;
            isEarlyReset = true;
          } else if (child.type === "Atrule" && child.name === "custom-variant") {
            sections.push({ name: "custom-variant", at: index });
          } else if (child.type === "Atrule" && child.name === "theme") {
            sections.push({ name: "theme", at: index });
          } else if (child.type === "Atrule" && child.name === "utility") {
            sections.push({ name: "utility", at: index });
          } else if (child.type === "Atrule" && child.name === "keyframes") {
            sections.push({ name: "keyframes", at: index });
          } else if (child.type === "Atrule" && child.name === "layer") {
            if (preludeIdentifiers(child).includes("base")) {
              sections.push({ name: "base styles", at: index });
            }
          } else if (
            child.type === "Rule" &&
            (selectorNames(child).includes("root") || scopesCustomProperties(child))
          ) {
            sections.push({ name: "root", at: index });
          } else if (child.type === "Atrule" && scopesCustomProperties(child)) {
            sections.push({ name: "root", at: index });
          }
          if (child.type !== "Comment" && !(child.type === "Atrule" && child.name === "import") && !isEarlyReset) {
            sawNonImport = true;
          }
          index += 1;
        }

        // The first occurrence of each section must not appear after a later
        // section has already started.
        const firstAt = new Map<string, number>();
        for (const section of sections) {
          if (!firstAt.has(section.name)) firstAt.set(section.name, section.at ?? 0);
        }

        let lastSeen = -1;
        for (const name of SECTION_ORDER) {
          const at = firstAt.get(name);
          if (at === undefined) continue;
          if (at < lastSeen) {
            context.report({
              node,
              message: `Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "${name}" before an earlier section.`,
            });
            return;
          }
          lastSeen = at;
        }

        // The first-occurrence check above misses a later reappearance of an
        // earlier section, e.g. @import after @theme. Check EVERY occurrence
        // so the ESLint preset owns the full ordering contract.
        let furthestSection = -1;
        let furthestName: string | undefined;
        for (const section of sections) {
          const order = SECTION_ORDER.findIndex((name) => name === section.name);
          if (order < furthestSection) {
            context.report({
              node,
              message: `Global stylesheet section "${section.name}" cannot reappear after "${String(furthestName)}". Keep all section occurrences in the required order.`,
            });
            return;
          }
          if (order > furthestSection) {
            furthestSection = order;
            furthestName = section.name;
          }
        }
      },
    };
  },
};
