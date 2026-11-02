/**
 * ESLint rule: pasika/at-rule-spacing
 *
 * Separate adjacent top-level CSS at-rules with a blank line, while allowing
 * consecutive @import declarations to stay together.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";

const EMPTY_LINE = /\n[ \t]*\n/u;
const LINE_BREAK = /\r\n|\n|\r/u;

export const atRuleSpacingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "layout",
    fixable: "whitespace",
    docs: {
      description: "Require a blank line between adjacent top-level CSS at-rules, excluding grouped imports.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const source = context.sourceCode.text;
        const newline = source.includes("\r\n") ? "\r\n" : "\n";
        for (let index = 1; index < node.children.length; index += 1) {
          const previous = node.children[index - 1];
          const current = node.children[index];
          if (previous?.type !== "Atrule" || current?.type !== "Atrule") continue;
          if (previous.name === "import" && current.name === "import") continue;

          if (!previous.loc || !current.loc) continue;
          const start = previous.loc.end.offset;
          const end = current.loc.start.offset;
          const between = source.slice(start, end);
          if (EMPTY_LINE.test(between.replace(/\r\n|\r/gu, "\n"))) continue;

          context.report({
            node: current,
            message: "Adjacent top-level @ rules must have a blank line between them.",
            fix(fixer) {
              return fixer.insertTextBeforeRange([end, end], LINE_BREAK.test(between) ? newline : newline + newline);
            },
          });
        }
      },
    };
  },
};
