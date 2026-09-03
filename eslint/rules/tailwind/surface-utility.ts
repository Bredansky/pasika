/**
 * ESLint rule: pasika/surface-utility
 *
 * A repeated combination containing at least two of the canvas, ink, and edge
 * roles plus any related styles MUST become a *-surface custom utility.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";

const SURFACE_ROLES = ["canvas", "ink", "edge"];

/** The semantic color roles represented by an applied class list. */
function semanticRoles(classes: string[]): Set<string> {
  return new Set(SURFACE_ROLES.filter((role) => classes.some((name) => name.includes(role))));
}

export const surfaceUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require repeated combinations of semantic color roles to become a *-surface utility.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const combinations = new Map<string, number>();
        for (const apply of atrulesNamed(node, "apply")) {
          const classes = preludeIdentifiers(apply);
          if (semanticRoles(classes).size < 2) continue;
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
