/**
 * ESLint rule: pasika/apply-usage
 *
 * Global selectors inside @layer base MUST contain only @apply directives.
 * Outside the base layer, ordinary selectors may use CSS variables and
 * @apply, but direct non-variable property declarations still require @apply.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { blockChildren, preludeIdentifiers } from "./helpers";

function reportRawDeclarations(
  context: Parameters<CSSRuleDefinition["create"]>[0],
  rule: CssNodePlain,
  insideBase: boolean,
): void {
  for (const child of blockChildren(rule)) {
    if (child.type === "Declaration") {
      if (!insideBase && child.property.startsWith("--")) continue;
      context.report({
        node: child,
        message: insideBase
          ? `Global selectors inside @layer base may only contain @apply directives; found "${child.property}".`
          : `Style declaration "${child.property}" inside a global selector must use @apply.`,
      });
      continue;
    }
    if (child.type === "Rule" || (child.type === "Atrule" && child.name !== "apply")) {
      reportRawDeclarations(context, child, insideBase);
    }
  }
}

export const applyUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require only @apply directives in global selectors inside @layer base.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        function visit(current: CssNodePlain, insideBase = false): void {
          if (current.type === "Atrule" && ["theme", "utility", "keyframes"].includes(current.name)) return;
          if (current.type === "Rule") {
            reportRawDeclarations(context, current, insideBase);
            return;
          }
          const inBaseLayer =
            insideBase ||
            (current.type === "Atrule" && current.name === "layer" && preludeIdentifiers(current).includes("base"));
          const children = current.type === "StyleSheet" ? current.children : blockChildren(current);
          for (const child of children) {
            if (child.type === "Rule" || child.type === "Atrule") visit(child, inBaseLayer);
          }
        }
        visit(node);
      },
    };
  },
};
