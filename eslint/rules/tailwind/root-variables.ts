/**
 * ESLint rule: pasika/root-variables
 *
 * Theme definitions may contain direct values or map to runtime CSS variables.
 * A variable-backed theme declaration must use @theme inline so Tailwind emits
 * the variable reference in the consuming utility at the correct cascade scope.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";

export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require @theme inline for theme values that reference runtime CSS variables.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          if (preludeIdentifiers(theme).includes("inline")) continue;
          // Tailwind tolerant mode may parse theme declarations as Raw nodes,
          // especially when --*: initial is present. Inspect only declaration
          // bodies, not comments or unrelated text, without relying on its AST.
          const source = context.sourceCode.getText(theme).replace(/\/\*[\s\S]*?\*\//gu, "");
          const hasVariableBackedValue = /--[a-z][\w-]*\s*:\s*[^;{}]*\bvar\s*\(/u.test(source);
          if (!hasVariableBackedValue) continue;
          context.report({
            node: theme,
            message: "Theme values that reference CSS variables must use @theme inline.",
          });
        }
      },
    };
  },
};
