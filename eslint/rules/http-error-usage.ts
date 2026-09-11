/**
 * ESLint rule: pasika/http-error-usage
 *
 * An HttpError constructed inside a withResponse pipeline MUST be thrown,
 * not returned. Returning it inside an async function resolves that
 * function's promise with the HttpError as an ordinary value instead of
 * rejecting it — an awaited caller receives it as if it were legitimate
 * data, not a failure.
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
      description: "Require an HttpError constructed inside a withResponse pipeline to be thrown, not returned.",
    },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        if (isNewHttpError(node.argument)) {
          context.report({
            node,
            message:
              "An HttpError constructed inside a withResponse pipeline must be thrown, not returned. " +
              "See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
      },
    };
  },
};
