/**
 * ESLint rule: pasika/color-role-usage
 * Enforce semantic color tokens in CSS and color roles in @apply.
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { colorRoleUsageMessage } from "../color-role";
import { atrulesNamed } from "./helpers";

const COLOR_TOKEN = /^--color-[a-z][a-z0-9-]*-(?:canvas|ink|edge)$/u;

export const colorRoleUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require semantic color-token names and matching Tailwind color utilities." },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          const source = context.sourceCode.getText(theme).replace(/\/\*[\s\S]*?\*\//gu, " ");
          for (const match of source.matchAll(/(?:^|[{;\r\n])\s*(?<token>--color-[a-z][a-z0-9-]*)\s*:/gu)) {
            const token = match.groups?.token;
            if (token && !COLOR_TOKEN.test(token)) {
              context.report({
                node: theme,
                message: `Color token "${token}" needs a semantic role ending in -canvas, -ink, or -edge.`,
              });
            }
          }
        }
        for (const apply of atrulesNamed(node, "apply")) {
          const source = context.sourceCode.getText(apply);
          const classes = source
            .replace(/^@apply\s+/u, "")
            .replace(/;\s*$/u, "")
            .trim()
            .split(/\s+/u);
          for (const className of classes) {
            const message = colorRoleUsageMessage(className);
            if (message) context.report({ node: apply, message });
          }
        }
      },
    };
  },
};
