/**
 * ESLint rule: pasika/root-variables
 *
 * Every value used for the project's styling MUST be defined as a CSS variable
 * in :root, and a Tailwind theme variable MUST reference that CSS variable
 * through @theme inline.
 *
 * @see docs/styling-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers, rules, selectorNames } from "./helpers.js";

export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require styling values to be CSS variables in :root referenced through @theme inline.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const hasRootVars = rules(node).some((rule) => {
          if (!selectorNames(rule).includes("root")) return false;
          return blockChildren(rule).some((child) => child.type === "Declaration");
        });
        if (!hasRootVars) {
          context.report({
            node,
            message: "Styling values must be defined as CSS variables in a :root block.",
          });
        }

        // A Tailwind theme variable that references a CSS variable must go
        // through @theme inline; a bare @theme block would generate values
        // instead of referencing the :root variables.
        const referencingThemes = atrulesNamed(node, "theme").filter((theme) =>
          blockChildren(theme).some((child) => {
            if (child.type === "Raw") return child.value.includes("var(");
            if (child.type === "Declaration") return JSON.stringify(child.value).includes("var(");
            return false;
          }),
        );
        const inlineThemes = atrulesNamed(node, "theme").filter((theme) =>
          preludeIdentifiers(theme).includes("inline"),
        );
        if (referencingThemes.length > 0 && inlineThemes.length === 0) {
          context.report({
            node,
            message: "Tailwind theme variables that reference CSS variables must use @theme inline.",
          });
        }
      },
    };
  },
};
