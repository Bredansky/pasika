/**
 * ESLint rule: pasika/global-selector-styling
 *
 * Global selectors outside the base layer may only scope CSS custom-property
 * overrides. Component/element styling belongs in Tailwind classes at the
 * consumer; document-wide defaults belong in @layer base.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { blockChildren } from "./helpers";

function hasStyling(node: CssNodePlain): boolean {
  for (const child of blockChildren(node)) {
    if (child.type === "Declaration" && !child.property.startsWith("--")) return true;
    if (child.type === "Atrule" && child.name === "apply") return true;
    if (child.type === "Rule" && hasStyling(child)) return true;
  }
  return false;
}

export const globalSelectorStylingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Forbid element/component styling in global selectors outside @layer base.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const child of node.children) {
          if (child.type !== "Rule" || !hasStyling(child)) continue;
          context.report({
            node: child,
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          });
        }
      },
    };
  },
};
