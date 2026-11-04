/**
 * ESLint rule: pasika/stylesheet-ordering
 *
 * The global stylesheet MUST place one @theme inline block (reset and global
 * tokens) immediately after its Tailwind import, before feature CSS imports.
 * Feature imports then precede @custom-variant, :root/@variant, utilities,
 * base styles, and keyframes.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate } from "@eslint/css-tree";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { blockChildren, preludeIdentifiers, selectorNames } from "./helpers";

const SECTION_ORDER = [
  "Tailwind import",
  "theme",
  "feature imports",
  "custom-variant",
  "root",
  "utility",
  "base styles",
  "keyframes",
] as const;
const LATE_RESET_ERROR =
  "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.";
const DUPLICATE_THEME_ERROR =
  "globals.css must use one @theme inline block for the reset and all global tokens; merge the theme blocks.";
const RESET_FIRST_ERROR =
  "The --*: initial reset must be the first declaration in the globals.css @theme inline block.";
const ORDER_ERROR =
  "Global stylesheet sections must be ordered: Tailwind import, one @theme inline block, feature imports, @custom-variant, :root/@variant, custom utilities, base styles, keyframes.";

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
        const sections: string[] = [];
        let sawFeatureImport = false;
        let themeBlocks = 0;
        for (const child of node.children) {
          const body = themeBody(child, context.sourceCode.text);
          if (containsThemeReset(body) && !/^--\*\s*:\s*initial\s*(?:;|$)/u.test(body ?? "")) {
            context.report({ node: child, message: RESET_FIRST_ERROR });
            return;
          }
          if (containsThemeReset(body) && sawFeatureImport) {
            context.report({ node: child, message: LATE_RESET_ERROR });
            return;
          }
          if (child.type === "Atrule" && child.name === "import") {
            if (isTailwindImport(child)) {
              sections.push("Tailwind import");
            } else {
              sawFeatureImport = true;
              sections.push("feature imports");
            }
          } else if (child.type === "Atrule" && child.name === "theme") {
            themeBlocks += 1;
            sections.push("theme");
          } else if (child.type === "Atrule" && child.name === "custom-variant") {
            sections.push("custom-variant");
          } else if (child.type === "Atrule" && child.name === "utility") {
            sections.push("utility");
          } else if (child.type === "Atrule" && child.name === "keyframes") {
            sections.push("keyframes");
          } else if (child.type === "Atrule" && child.name === "layer") {
            if (preludeIdentifiers(child).includes("base")) {
              sections.push("base styles");
            }
          } else if (
            child.type === "Rule" &&
            (selectorNames(child).includes("root") || scopesCustomProperties(child))
          ) {
            sections.push("root");
          } else if (child.type === "Atrule" && scopesCustomProperties(child)) {
            sections.push("root");
          }
        }

        if (themeBlocks > 1) {
          context.report({ node, message: DUPLICATE_THEME_ERROR });
          return;
        }

        // Validate every occurrence, including a misplaced import after utilities.
        let furthestSection = -1;
        for (const section of sections) {
          const order = SECTION_ORDER.findIndex((name) => name === section);
          if (order < furthestSection) {
            context.report({ node, message: ORDER_ERROR });
            return;
          }
          furthestSection = order;
        }
      },
    };
  },
};
