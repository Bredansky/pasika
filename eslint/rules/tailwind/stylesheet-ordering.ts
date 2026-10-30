/**
 * ESLint rule: pasika/stylesheet-ordering
 *
 * The global stylesheet MUST order imports, @custom-variant definitions, :root
 * variables and the selectors that override them, @theme definitions, custom
 * utilities, base styles, and keyframes in that order.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { blockChildren, preludeIdentifiers, selectorNames } from "./helpers";

const SECTION_ORDER = ["imports", "custom-variant", "root", "theme", "utility", "base styles", "keyframes"] as const;

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
        for (const child of node.children) {
          if (child.type === "Atrule" && child.name === "import") {
            sections.push({ name: "imports", at: index });
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
