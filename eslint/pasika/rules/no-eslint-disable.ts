/**
 * ESLint rule: pasika/no-eslint-disable
 *
 * Code MUST NOT use eslint-disable directives, and a reported violation MUST
 * be fixed instead.
 *
 * @see docs/agent-policy.md
 */

import type { Rule } from "eslint";

export const noEslintDisableRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Forbid eslint-disable directives.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!comment.value.includes("eslint-disable")) continue;
          if (!comment.loc) continue;
          context.report({
            loc: comment.loc,
            message: "Do not use eslint-disable directives; fix the reported violation instead.",
          });
        }
      },
    };
  },
};
