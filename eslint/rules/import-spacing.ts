/**
 * ESLint rule: pasika/import-spacing
 *
 * Keeps ordinary import declarations contiguous while visually separating
 * the server-only side-effect marker from the imports that follow.
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */
import type { Rule } from "eslint";

const MESSAGE =
  "Consecutive ordinary import declarations must not be separated by a blank line. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";
const SERVER_ONLY_MESSAGE =
  'Leave a blank line after import "server-only"; before other imports. ' +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

function hasBlankLine(text: string): boolean {
  return /\r?\n[\t ]*\r?\n/u.test(text);
}

function removeBlankLines(text: string): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  return text.replace(/(?:\r?\n[\t ]*){2,}/gu, newline);
}

export const importSpacingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "layout",
    fixable: "whitespace",
    docs: {
      description: "Keep ordinary imports together and separate the server-only boundary marker.",
    },
  },
  create(context) {
    return {
      Program() {
        const statements = context.sourceCode.ast.body;

        for (let index = 1; index < statements.length; index += 1) {
          const previous = statements[index - 1];
          const current = statements[index];
          if (previous?.type !== "ImportDeclaration" || current?.type !== "ImportDeclaration") continue;

          const previousEnd = previous.range?.[1];
          const currentStart = current.range?.[0];
          if (previousEnd === undefined || currentStart === undefined) continue;

          const gap = context.sourceCode.text.slice(previousEnd, currentStart);
          const isServerOnlyMarker = previous.source.value === "server-only" && previous.specifiers.length === 0;
          if (isServerOnlyMarker) {
            if (hasBlankLine(gap)) continue;

            context.report({
              node: current,
              message: SERVER_ONLY_MESSAGE,
              fix(fixer) {
                const newline = context.sourceCode.text.includes("\r\n") ? "\r\n" : "\n";
                return fixer.insertTextBefore(current, gap.includes("\n") ? newline : newline + newline);
              },
            });
            continue;
          }

          if (!hasBlankLine(gap)) continue;
          context.report({
            node: current,
            message: MESSAGE,
            fix(fixer) {
              return fixer.replaceTextRange([previousEnd, currentStart], removeBlankLines(gap));
            },
          });
        }
      },
    };
  },
};
