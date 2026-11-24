/**
 * ESLint rule: pasika/prefer-named-imports
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */
import type { Rule } from "eslint";

const MESSAGE =
  "Use named imports instead of namespace imports. See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

export const preferNamedImportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "suggestion",
    docs: {
      description: "Require named imports instead of namespace imports.",
    },
  },
  create(context) {
    return {
      ImportNamespaceSpecifier(node) {
        context.report({ node, message: MESSAGE });
      },
    };
  },
};
