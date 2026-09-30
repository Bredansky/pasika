/**
 * ESLint rule: pasika/file-length
 *
 * Keeps application source files bounded so a file cannot accumulate several
 * independent responsibilities without forcing an extraction decision.
 *
 * @see docs/next-codebase-guide/rules/application-structure-rule.md
 */
import type { Rule } from "eslint";

const MAX_SOURCE_FILE_LINES = 300;

export const fileLengthRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require application source files to stay at or below 300 lines.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const lineCount = context.sourceCode.lines.length;
        if (lineCount <= MAX_SOURCE_FILE_LINES) return;

        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Source file has ${String(lineCount)} lines; split it so no source file exceeds ${String(MAX_SOURCE_FILE_LINES)} lines. ` +
            "See docs/next-codebase-guide/rules/application-structure-rule.md",
        });
      },
    };
  },
};
