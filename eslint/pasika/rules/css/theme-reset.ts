/**
 * ESLint rule: pasika/theme-reset
 *
 * The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
 *
 * @see docs/styling-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren } from "./helpers.js";

export const themeResetRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require Tailwind's default theme reset --*: initial.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const resetFound = atrulesNamed(node, "theme").some((theme) =>
          blockChildren(theme).some((child) => {
            if (child.type === "Declaration") return child.property.startsWith("--*");
            if (child.type === "Raw") return child.value.includes("--*: initial");
            return false;
          }),
        );

        if (!resetFound) {
          context.report({
            node,
            message:
              "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
          });
        }
      },
    };
  },
};
