/**
 * ESLint rule: pasika/theme-reset
 *
 * The global stylesheet MUST reset Tailwind's default theme with `--*: initial`.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, walkNodes } from "./helpers";

/**
 * True when `node` is the `--*: initial` reset: a declaration whose property is
 * `--*`, or a `Raw` (how the tolerant parser carries unparseable content) whose
 * text contains it.
 */
function isThemeReset(node: CssNodePlain | undefined): boolean {
  if (!node) return false;
  if (node.type === "Declaration") return node.property.startsWith("--*");
  if (node.type === "Raw") return node.value.includes("--*: initial");
  return false;
}

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
        const resetFound = atrulesNamed(node, "theme").some((theme) => {
          // The reset sits among the block's direct children. When the block
          // also nests @keyframes (the Tailwind v4 pattern for --animate-*),
          // the tolerant parser wraps the surrounding declarations in a Rule,
          // so walk every descendant rather than only direct children.
          const direct = blockChildren(theme).some(isThemeReset);
          if (direct) return true;
          let nested = false;
          walkNodes(theme, (current) => {
            if (nested) return;
            if (isThemeReset(current)) nested = true;
          });
          return nested;
        });

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
