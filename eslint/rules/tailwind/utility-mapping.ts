/**
 * ESLint rule: pasika/utility-mapping
 *
 * A custom utility maps one Tailwind styling operation into the project's
 * Tailwind API. Reusable presentation belongs in components instead of
 * utilities that bundle multiple operations.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers, rawValue } from "./helpers";

function applyOperationCount(utility: CssNodePlain): number {
  let count = 0;

  for (const apply of atrulesNamed(utility, "apply")) {
    const identifiers = preludeIdentifiers(apply);
    if (identifiers.length > 0) {
      count += identifiers.length;
      continue;
    }

    const prelude = "prelude" in apply ? apply.prelude : undefined;
    const raw = prelude ? rawValue(prelude) : "";
    const rawOperations = raw.trim().split(/\s+/).filter(Boolean);
    count += rawOperations.length > 0 ? rawOperations.length : 1;
  }

  return count;
}

export const utilityMappingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require custom utilities to map exactly one Tailwind styling operation.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0] ?? "unknown";
          const operationCount = applyOperationCount(utility);
          if (operationCount === 1) continue;

          context.report({
            node: utility,
            message:
              `Custom utility "${name}" maps ${String(operationCount)} Tailwind operations; ` +
              "custom utilities must map exactly one operation. Reusable presentation belongs in a component.",
          });
        }
      },
    };
  },
};
