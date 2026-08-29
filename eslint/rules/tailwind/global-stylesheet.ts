/**
 * ESLint rule: pasika/global-stylesheet
 *
 * A repository MUST have one global stylesheet entry point that registers
 * Tailwind. This rule verifies that when CSS files are linted, at least
 * one CSS file contains `@import "tailwindcss"`.
 *
 * @see docs/styling-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";

export const globalStylesheetRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a global stylesheet entry point that registers Tailwind.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const registersTailwind = node.children.some(
          (child) =>
            child.type === "Atrule" && child.name === "import" && JSON.stringify(child.prelude).includes("tailwindcss"),
        );
        if (!registersTailwind) {
          const hasProjectCss = node.children.some((child) => {
            if (child.type === "Atrule" && child.name === "import") return false;
            if (child.type === "Comment") return false;
            return true;
          });
          if (hasProjectCss) {
            context.report({
              node,
              message: 'Global stylesheet must register Tailwind with @import "tailwindcss".',
            });
          }
        }
      },
    };
  },
};
