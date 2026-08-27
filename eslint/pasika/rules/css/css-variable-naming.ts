/**
 * ESLint rule: pasika/css-variable-naming
 *
 * A CSS variable intended only for a background MUST be named --<role>-canvas,
 * and one intended only for readable text MUST be named --<role>-ink.
 *
 * @see docs/styling-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { DeclarationPlain } from "@eslint/css-tree";

export const cssVariableNamingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require background variables to end in -canvas and text variables to end in -ink.",
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
      },
    };
  },
};
