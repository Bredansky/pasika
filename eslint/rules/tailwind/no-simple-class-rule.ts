/**
 * ESLint rule: pasika/no-simple-class-rule
 *
 * One-class CSS rules duplicate Tailwind's utility-class mechanism. Apply
 * Tailwind utilities at the element instead of defining a wrapper class.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { RulePlain } from "@eslint/css-tree";

export const noSimpleClassRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require Tailwind utilities on elements instead of simple CSS class rules.",
    },
  },
  create(context) {
    return {
      Rule(node: RulePlain) {
        const prelude = node.prelude;
        if (prelude.type !== "SelectorList") return;
        for (const selector of prelude.children) {
          if (selector.type !== "Selector" || selector.children.length !== 1) continue;
          if (selector.children[0]?.type !== "ClassSelector") continue;
          context.report({
            node,
            message: "Simple CSS class rules are forbidden. Apply Tailwind utilities directly on the element instead.",
          });
          return;
        }
      },
    };
  },
};
