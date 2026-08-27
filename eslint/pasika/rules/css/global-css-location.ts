/**
 * ESLint rule: pasika/global-css-location
 *
 * The project's global CSS MUST live in the global stylesheet entry point and
 * MUST NOT be imported from another file.
 *
 * @see docs/styling-guide/rules/global-stylesheet-rule.md
 */

import type { Rule } from "eslint";
import type { StyleSheetPlain } from "@eslint/css-tree";

export const globalCssLocationRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require project global CSS to live only in the entry point stylesheet.",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // The entry point registers Tailwind. Any other stylesheet with
        // project CSS — or that imports the entry point — splits global CSS
        // out of the entry point.
        const registersTailwind = node.children.some(
          (child) =>
            child.type === "Atrule" && child.name === "import" && JSON.stringify(child.prelude).includes("tailwindcss"),
        );
        if (registersTailwind) return;

        const hasProjectCss = node.children.some((child) => {
          if (child.type === "Atrule" && child.name === "import") return false;
          if (child.type === "Comment") return false;
          return true;
        });
        if (!hasProjectCss) return;

        context.report({
          node,
          message:
            "Global CSS must live in the global stylesheet entry point that registers Tailwind, not in this file.",
        });
      },
    };
  },
};
