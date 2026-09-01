/**
 * ESLint rule: pasika/custom-utility-apply
 *
 * A custom utility MUST use @apply for every styling declaration added by the
 * project. When no named built-in utility represents a property value, it MUST
 * apply the Tailwind custom-property or arbitrary-property utility instead.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren } from "./helpers";

/** The property name when a tolerant-mode `Raw` is actually `property: value`. */
function rawProperty(raw: string): string | undefined {
  const match = /^\s*(?<property>[a-z][a-z-]*)\s*:/.exec(raw);
  return match?.groups?.property;
}

export const customUtilityApplyRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require @utility blocks to style through @apply.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          for (const child of blockChildren(utility)) {
            if (child.type === "Atrule" && child.name === "apply") continue;
            if (child.type === "Declaration") {
              context.report({
                node: child,
                message: `Custom utility must use @apply for styling declaration "${child.property}".`,
              });
              continue;
            }
            if (child.type === "Raw") {
              const property = rawProperty(child.value);
              if (property !== undefined) {
                context.report({
                  node: child,
                  message: `Custom utility must use @apply for styling declaration "${property}".`,
                });
              }
            }
          }
        }
      },
    };
  },
};
