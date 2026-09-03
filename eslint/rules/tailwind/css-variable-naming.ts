/**
 * ESLint rule: pasika/css-variable-naming
 *
 * Property-specific color variables use semantic suffixes: -canvas for a
 * background, -ink for readable text, and -edge for a visual boundary.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { DeclarationPlain } from "@eslint/css-tree";

const EDGE_PROPERTY_WORDS = new Set(["border", "divider", "outline", "ring", "stroke"]);
const NON_COLOR_WORDS = new Set(["offset", "radius", "spacing", "style", "width"]);

/** Whether a custom-property name looks like a property-specific boundary color. */
function looksLikeEdgeColor(lower: string): boolean {
  const words = lower.slice(2).split("-");
  return words.some((word) => EDGE_PROPERTY_WORDS.has(word)) && !words.some((word) => NON_COLOR_WORDS.has(word));
}

export const cssVariableNamingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require property-specific color variables to use canvas, ink, and edge role suffixes.",
    },
  },
  create(context) {
    return {
      Declaration(node: DeclarationPlain) {
        const property = node.property;
        if (!property.startsWith("--")) return;
        const lower = property.toLowerCase();
        if ((lower.includes("bg") || lower.includes("background")) && !lower.endsWith("-canvas")) {
          context.report({
            node,
            message: `CSS variable "${property}" looks like a background token; name it --<role>-canvas instead.`,
          });
        }
        if (lower.includes("text") && !lower.endsWith("-ink")) {
          context.report({
            node,
            message: `CSS variable "${property}" looks like a text token; name it --<role>-ink instead.`,
          });
        }
        if (looksLikeEdgeColor(lower) && !lower.endsWith("-edge")) {
          context.report({
            node,
            message: `CSS variable "${property}" looks like a boundary token; name it --<role>-edge instead.`,
          });
        }
      },
    };
  },
};
