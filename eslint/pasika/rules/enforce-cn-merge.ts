/**
 * ESLint rule: pasika/enforce-cn-merge
 *
 * Enforces the "Class Composition Rule".
 *
 * @see docs/styling-guide/rules/class-composition-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

function classCount(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}

export const enforceCnMergeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce cn() for conditional class merging.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node: any) {
        if (node.name.name !== "className" && node.name.name !== "class") return;

        const valueNode = node.value;
        if (!valueNode) return;

        if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
          if (classCount(valueNode.value) > 5) {
            context.report({
              node,
              message:
                "Static className with more than 5 classes must use cn() with grouped string literals. " +
                "See docs/styling-guide/rules/class-composition-rule.md",
            });
          }
          return;
        }

        if (valueNode.type !== "JSXExpressionContainer" || !valueNode.expression) return;
        const expr = valueNode.expression;

        if (expr.type === "BinaryExpression" && expr.operator === "+") {
          context.report({
            node,
            message:
              "Use cn() instead of + operator for className. " +
              "See docs/styling-guide/rules/class-composition-rule.md",
          });
          return;
        }

        if (expr.type === "TemplateLiteral" && expr.expressions.length > 0) {
          context.report({
            node,
            message:
              "Use cn() instead of template literals with conditionals for className. " +
              "See docs/styling-guide/rules/class-composition-rule.md",
          });
          return;
        }

        if (expr.type === "Literal" && typeof expr.value === "string") {
          if (classCount(expr.value) > 5) {
            context.report({
              node,
              message:
                "Static className with more than 5 classes must use cn() with grouped string literals. " +
                "See docs/styling-guide/rules/class-composition-rule.md",
            });
          }
          return;
        }

        if (expr.type === "CallExpression" && expr.callee.type === "Identifier" && expr.callee.name === "cn") {
          for (const arg of expr.arguments) {
            if (arg.type === "Literal" && typeof arg.value === "string") {
              if (classCount(arg.value) > 5) {
                context.report({
                  node: arg,
                  message:
                    "Each cn() string argument must contain at most 5 class names. " +
                    "Group by styling concern. " +
                    "See docs/styling-guide/rules/class-composition-rule.md",
                });
              }
            }
          }
        }
      },
    };
  },
};

/* eslint-enable  -- re-enable rules disabled for AST access @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
