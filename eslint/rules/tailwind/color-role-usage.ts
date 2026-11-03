/**
 * ESLint rule: pasika/color-role-usage
 * Enforce semantic color and background-image tokens in CSS and color roles in @apply.
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { colorRoleUsageMessage } from "../color-role";
import { atrulesNamed } from "./helpers";

const COLOR_TOKEN = /^--color-[a-z][a-z0-9-]*-(?:canvas|ink|edge)$/u;
const BACKGROUND_IMAGE_TOKEN = /^--background-image-[a-z][a-z0-9-]*-canvas$/u;
const COMPOSITE_COLOR_REFS =
  /--(?:inset-shadow|shadow|drop-shadow|text-shadow|background-image)-[a-z][a-z0-9-]*\s*:\s*[^;}]*/gu;
const TOKEN_REF = /\bvar\s*\(\s*(?<token>--color-[a-z][a-z0-9-]*)/gu;

export const colorRoleUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require semantic color and background-image token names and matching Tailwind color utilities.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          const source = context.sourceCode.getText(theme).replace(/\/\*[\s\S]*?\*\//gu, " ");
          const compositeRefs = new Set(
            [...source.matchAll(COMPOSITE_COLOR_REFS)].flatMap((effect) =>
              [...effect[0].matchAll(TOKEN_REF)].map((reference) => reference.groups?.token),
            ),
          );
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
            } else if (!COLOR_TOKEN.test(token) && !compositeRefs.has(token)) {
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
