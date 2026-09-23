/**
 * ESLint rule: pasika/apply-usage
 *
 * Style declarations added by the project inside global selectors MUST use
 * @apply.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { blockChildren } from "./helpers";

function reportRawDeclarations(context: Parameters<CSSRuleDefinition["create"]>[0], rule: CssNodePlain): void {
  for (const child of blockChildren(rule)) {
    if (child.type === "Declaration") {
      if (child.property.startsWith("--")) continue;
      context.report({
        node: child,
        message: `Style declaration "${child.property}" inside a global selector must use @apply.`,
      });
      continue;
    }
    if (child.type === "Rule") reportRawDeclarations(context, child);
  }
}

export const applyUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require @apply for project style declarations inside global selectors.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // Check every top-level selector, not only @layer base. Theme selectors
        // may declare CSS custom properties directly; every other styling
        // declaration must go through Tailwind's @apply.
        for (const child of node.children) {
          if (child.type === "Rule") reportRawDeclarations(context, child);
          if (child.type !== "Atrule" || child.name !== "layer") continue;
          for (const layered of blockChildren(child)) {
            if (layered.type === "Rule") reportRawDeclarations(context, layered);
          }
        }
      },
    };
  },
};
