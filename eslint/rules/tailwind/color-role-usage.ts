/**
 * ESLint rule: pasika/color-role-usage
 * Enforce semantic color and background-image tokens in CSS and color roles in @apply.
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { colorRoleUsageMessage, nonterminalColorRole } from "../color-role";
import { atrulesNamed } from "./helpers";

const COLOR_TOKEN = /^--color-[a-z][a-z0-9-]*$/u;
const BACKGROUND_IMAGE_TOKEN = /^--background-image-[a-z][a-z0-9-]*-canvas$/u;

export const colorRoleUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Allow shared color tokens while enforcing explicit semantic roles and background-image naming.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          const source = context.sourceCode.getText(theme).replace(/\/\*[\s\S]*?\*\//gu, " ");
          for (const match of source.matchAll(
            /(?:^|[{;\r\n])\s*(?<token>--(?:color|background-image)-[a-z][a-z0-9-]*)\s*:/gu,
          )) {
            const token = match.groups?.token;
            if (!token) continue;
            if (token.startsWith("--background-image-")) {
              if (!BACKGROUND_IMAGE_TOKEN.test(token)) {
                context.report({
                  node: theme,
                  message: `Background-image token "${token}" needs a semantic role ending in -canvas.`,
                });
              }
            } else if (!COLOR_TOKEN.test(token)) {
              context.report({
                node: theme,
                message: `Color token "${token}" must use a valid --color-* name, optionally ending in -canvas, -ink, or -edge.`,
              });
            } else {
              const nonterminalRole = nonterminalColorRole(token);
              if (nonterminalRole) {
                context.report({
                  node: theme,
                  message: `Color token "${token}" places semantic role "-${nonterminalRole}" before the end of its name; move the role to the end or omit it for shared colors.`,
                });
              }
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
