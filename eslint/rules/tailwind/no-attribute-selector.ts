/**
 * ESLint rule: pasika/no-attribute-selector
 *
 * Attribute-based CSS selectors couple presentation to DOM state and
 * accessibility attributes. Prefer explicit component classes instead.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { AttributeSelector } from "@eslint/css-tree";

export const noAttributeSelectorRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow CSS attribute selectors; use explicit component classes instead.",
    },
  },
  create(context) {
    return {
      AttributeSelector(node: AttributeSelector) {
        context.report({
          node,
          message: "CSS attribute selectors are forbidden. Use an explicit component class instead.",
        });
      },
    };
  },
};
