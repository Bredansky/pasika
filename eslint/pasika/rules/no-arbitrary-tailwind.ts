/**
 * ESLint rule: pasika/no-arbitrary-tailwind
 *
 * Enforces the "Arbitrary Value Rule" — no arbitrary-value Tailwind classes.
 *
 * @see docs/styling-guide/rules/arbitrary-value-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

const ARBITRARY_VALUE_RE = /(?:(?:^|(?<!\w))(?:[a-z]+(?:-[a-z]+)*)-\[[^\]]+\])/g;

export const noArbitraryTailwindRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow Tailwind arbitrary-value classes like rounded-[13px].",
    },
  },
  create(context) {
    function checkQuasis(node: Rule.Node, quasis: { value: { raw: string } }[]): void {
      for (const quasi of quasis) {
        ARBITRARY_VALUE_RE.lastIndex = 0;
        const match = ARBITRARY_VALUE_RE.exec(quasi.value.raw);
        if (match) {
          context.report({
            node,
            message:
              `Tailwind arbitrary-value class "${match[0]}" is not allowed. ` +
              "Use a named token or custom utility. " +
              "See docs/styling-guide/rules/arbitrary-value-rule.md",
          });
        }
      }
    }

    return {
      JSXAttribute(node: any) {
        if (node.name.name !== "className" && node.name.name !== "class") return;

        const valueNode = node.value;
        if (!valueNode) return;

        if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
          ARBITRARY_VALUE_RE.lastIndex = 0;
          const match = ARBITRARY_VALUE_RE.exec(valueNode.value);
          if (match) {
            context.report({
              node,
              message:
                `Tailwind arbitrary-value class "${match[0]}" is not allowed. ` +
                "Use a named token or custom utility. " +
                "See docs/styling-guide/rules/arbitrary-value-rule.md",
            });
          }
        } else if (valueNode.type === "JSXExpressionContainer" && valueNode.expression) {
          const expr = valueNode.expression;
          if (expr.type === "Literal" && typeof expr.value === "string") {
            ARBITRARY_VALUE_RE.lastIndex = 0;
            const match = ARBITRARY_VALUE_RE.exec(expr.value);
            if (match) {
              context.report({
                node,
                message:
                  `Tailwind arbitrary-value class "${match[0]}" is not allowed. ` +
                  "Use a named token or custom utility. " +
                  "See docs/styling-guide/rules/arbitrary-value-rule.md",
              });
            }
          } else if (expr.type === "TemplateLiteral") {
            checkQuasis(node, expr.quasis);
          }
        }
      },

      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        const calleeName = node.callee.name;
        if (calleeName !== "cn" && calleeName !== "clsx" && calleeName !== "twMerge" && calleeName !== "twJoin") return;

        for (const arg of node.arguments) {
          if (arg.type === "Literal" && typeof arg.value === "string") {
            ARBITRARY_VALUE_RE.lastIndex = 0;
            const match = ARBITRARY_VALUE_RE.exec(arg.value);
            if (match) {
              context.report({
                node,
                message:
                  `Tailwind arbitrary-value class "${match[0]}" is not allowed. ` +
                  "Use a named token or custom utility. " +
                  "See docs/styling-guide/rules/arbitrary-value-rule.md",
              });
            }
          } else if (arg.type === "TemplateLiteral") {
            checkQuasis(node, arg.quasis);
          }
        }
      },
    };
  },
};

/* eslint-enable  -- re-enable rules disabled for AST access @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
