/**
 * ESLint rule: pasika/apply-usage
 *
 * Style declarations added by the project inside global selectors MUST use
 * @apply.
 *
 * @see docs/styling-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { blockChildren } from "./helpers.js";

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
        // Project style declarations inside global selectors are the ones in
        // @layer base rules. Each rule's declarations must go through @apply,
        // not raw CSS properties.
        const layers = node.children.filter((child) => child.type === "Atrule" && child.name === "layer");
        for (const layer of layers) {
          for (const child of blockChildren(layer)) {
            if (child.type !== "Rule") continue;
            for (const declaration of blockChildren(child)) {
              if (declaration.type !== "Declaration") continue;
              // @apply itself arrives as an Atrule, so a raw Declaration means
              // the project wrote a property by hand instead of applying a
              // utility.
              context.report({
                node: declaration,
                message: `Style declaration "${declaration.property}" inside a global selector must use @apply.`,
              });
            }
          }
        }
      },
    };
  },
};
