/**
 * ESLint rule: pasika/surface-utility
 *
 * A repeated combination of canvas, ink, and related styles MUST become a
 * *-surface custom Tailwind utility that owns the combination.
 *
 * @see docs/styling-guide/rules/theme-and-utility-definition-rule.md
 */

import type { Rule } from "eslint";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers.js";

export const surfaceUtilityRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require repeated canvas+ink combinations to become a *-surface utility.",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const combinations = new Map<string, number>();
        for (const apply of atrulesNamed(node, "apply")) {
          const classes = preludeIdentifiers(apply);
          if (!classes.some((name) => name.includes("canvas")) || !classes.some((name) => name.includes("ink"))) {
            continue;
          }
          const key = [...classes].sort().join(" ");
          combinations.set(key, (combinations.get(key) ?? 0) + 1);
        }

        for (const [combo, count] of combinations) {
          if (count < 2) continue;
          context.report({
            node,
            message: `Combination "${combo}" appears ${String(count)} times. Create a *-surface custom Tailwind utility for it.`,
          });
        }
      },
    };
  },
};
