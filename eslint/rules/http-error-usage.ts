/**
 * ESLint rule: pasika/http-error-usage
 *
 * A delegated function that constructs an HttpError MUST throw it, not
 * return it. Nothing catches an HttpError a function merely returns — a
 * caller composing awaited calls in sequence never sees it, and it reaches
 * no boundary at all instead of being mapped to a response.
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
      description: "Require a delegated function that constructs an HttpError to throw it, not return it.",
    },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        if (isNewHttpError(node.argument)) {
          context.report({
            node,
            message:
              "A delegated function that constructs an HttpError must throw it, not return it. " +
              "See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
      },
    };
  },
};
