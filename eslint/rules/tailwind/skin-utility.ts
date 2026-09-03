/**
 * ESLint rule: pasika/skin-utility
 *
 * A repeated combination containing at least two semantic canvas, ink, or edge
 * utilities plus any related styles MUST become a *-skin custom utility.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";

const SEMANTIC_ROLES = ["canvas", "ink", "edge"];

/** The distinct semantic color utilities represented by an applied class list. */
function semanticUtilities(classes: string[]): Set<string> {
  return new Set(classes.filter((name) => SEMANTIC_ROLES.some((role) => name.includes(role))));
}

export const skinUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require repeated combinations of semantic color utilities to become a *-skin utility.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          const applied = new Set(atrulesNamed(utility, "apply").flatMap((apply) => preludeIdentifiers(apply)));
          if (applied.size < 2 || name?.endsWith("-skin") === true) continue;
          context.report({
            node: utility,
            message: `Custom utility "${name ?? "unknown"}" combines ${String(applied.size)} styles; use the *-skin suffix.`,
          });
        }

        const combinations = new Map<string, number>();
        for (const apply of atrulesNamed(node, "apply")) {
          const classes = preludeIdentifiers(apply);
          if (semanticUtilities(classes).size < 2) continue;
          const key = [...classes].sort().join(" ");
          combinations.set(key, (combinations.get(key) ?? 0) + 1);
        }

        for (const [combo, count] of combinations) {
          if (count < 2) continue;
          context.report({
            node,
            message: `Combination "${combo}" appears ${String(count)} times. Create a *-skin custom Tailwind utility for it.`,
          });
        }
      },
    };
  },
};
