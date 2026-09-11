/**
 * ESLint rule: pasika/http-error-usage
 *
 * A constructed HttpError MUST be thrown, not returned. Nothing catches an
 * HttpError a function merely returns — a caller composing awaited calls in
 * sequence never sees it, and it reaches no boundary at all instead of being
 * mapped to a response.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

function isNewHttpError(node: ESTree.Expression | null | undefined): boolean {
  return node?.type === "NewExpression" && node.callee.type === "Identifier" && node.callee.name === "HttpError";
}

export const httpErrorUsageRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a constructed HttpError to be thrown, not returned.",
    },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        if (isNewHttpError(node.argument)) {
          context.report({
            node,
            message:
              "A constructed HttpError must be thrown, not returned. " +
              "See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
      },
    };
  },
};
