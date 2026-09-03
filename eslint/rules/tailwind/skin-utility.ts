/**
 * ESLint rule: pasika/skin-utility
 *
 * A combination of two or more styles that multiple consumers use together and
 * should change together MUST become a <role>-skin custom utility.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";

export const skinUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require reusable style combinations to become *-skin utilities.",
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
          if (new Set(classes).size < 2) continue;
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
