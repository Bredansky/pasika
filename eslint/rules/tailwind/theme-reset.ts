/**
 * ESLint rule: pasika/theme-reset
 *
 * Only globals.css may reset Tailwind's default theme with `--*: initial`.
 * Feature stylesheets may define tokens but must never clear the shared theme.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate } from "@eslint/css-tree";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { atrulesNamed, blockChildren, walkNodes } from "./helpers";

/** The tolerant parser may carry Tailwind's --*: initial as a Raw node. */
function isThemeReset(node: CssNodePlain | undefined): boolean {
  if (!node) return false;
  if (node.type === "Declaration") return node.property === "--*" && generate(node.value).trim() === "initial";
  if (node.type === "Raw") return /(?:^|[;{])\s*--\*\s*:\s*initial\s*(?:;|$)/u.test(node.value);
  return false;
}

function hasThemeReset(node: StyleSheetPlain): boolean {
  return atrulesNamed(node, "theme").some((theme) => {
    if (blockChildren(theme).some(isThemeReset)) return true;
    let nested = false;
    walkNodes(theme, (child) => {
      if (isThemeReset(child)) nested = true;
    });
    return nested;
  });
}

export const themeResetRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the default-theme reset in globals.css, never in feature stylesheets.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const entryPoint = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    if (path.dirname(current) !== path.dirname(entryPoint)) return {};

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const hasReset = hasThemeReset(node);
        if (current !== entryPoint) {
          if (hasReset) {
            context.report({
              node,
              message:
                "Only globals.css may reset Tailwind's default theme with --*: initial; remove it from feature stylesheets.",
            });
          }
          return;
        }
        if (!hasReset) {
          context.report({
            node,
            message:
              "globals.css must reset Tailwind's default theme with --*: initial inside @theme or @theme inline.",
          });
        }
      },
    };
  },
};
