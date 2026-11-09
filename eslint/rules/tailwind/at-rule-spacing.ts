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
const GROUP_COMMENT_BETWEEN = /^(?<before>[ \t\r\n]*)(?<group>\/\*\s*Group:[^\r\n]*\*\/)(?<after>[ \t\r\n]*)$/u;
const LINE_END_INDENT = /(?:\r\n|\n|\r)(?<indent>[ \t]*)$/u;

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
          const groupMatch = GROUP_COMMENT_BETWEEN.exec(between);
          if (groupMatch?.groups) {
            const { before, group, after } = groupMatch.groups;
            if (before === undefined || group === undefined || after === undefined) continue;
            const hasBlankBefore = EMPTY_LINE.test(before.replace(/\r\n|\r/gu, "\n"));
            const hasBlankAfter = EMPTY_LINE.test(after.replace(/\r\n|\r/gu, "\n"));
            if (hasBlankBefore && !hasBlankAfter) continue;

            const groupIndent = LINE_END_INDENT.exec(before)?.groups?.indent ?? "";
            const nextIndent = LINE_END_INDENT.exec(after)?.groups?.indent ?? "";
            context.report({
              node: current,
              message:
                "A CSS consumer group comment must immediately precede its @ rule, with a blank line before the comment.",
              fix(fixer) {
                return fixer.replaceTextRange(
                  [start, end],
                  `${newline}${newline}${groupIndent}${group}${newline}${nextIndent}`,
                );
              },
            });
            continue;
          }
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
