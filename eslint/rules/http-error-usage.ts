/**
 * ESLint rule: pasika/http-error-usage
 *
 * A function that constructs an HttpError MUST report it through err, not
 * throw it. Throwing defeats the Result pipeline: the function's own return
 * type promises a Result a caller can check .ok on, and a throw bypasses
 * that promise, reaching the caller as an uncaught exception instead.
 *
 * @see docs/next-codebase-guide/rules/httperror-usage-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

function isNewHttpError(node: ESTree.Expression): boolean {
  return node.type === "NewExpression" && node.callee.type === "Identifier" && node.callee.name === "HttpError";
}

export const httpErrorUsageRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a constructed HttpError to be reported through err, not thrown.",
    },
  },
  create(context) {
    return {
      ThrowStatement(node) {
        if (isNewHttpError(node.argument)) {
          context.report({
            node,
            message:
              "A constructed HttpError must be reported through err, not thrown. " +
              "See docs/next-codebase-guide/rules/httperror-usage-rule.md",
          });
        }
      },
    };
  },
};
