/**
 * ESLint rule: pasika/jsx-hygiene
 *
 * Keeps calculations and complex conditions out of JSX children and attributes.
 *
 * @see docs/code-organization-guide/rules/jsx-hygiene-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- ESTree JSX nodes expose parser-specific fields */

import type { Rule } from "eslint";

const ARITHMETIC_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

function isNode(value: unknown): value is { type: string; [key: string]: any } {
  return typeof value === "object" && value !== null && "type" in value;
}

function isCallExpression(node: unknown): boolean {
  return isNode(node) && node.type === "CallExpression";
}

function isMemberExpression(node: unknown): boolean {
  return isNode(node) && (node.type === "MemberExpression" || node.type === "OptionalMemberExpression");
}

function logicalOperatorCount(node: any): number {
  if (!isNode(node) || node.type !== "LogicalExpression") return 0;
  return 1 + logicalOperatorCount(node.left) + logicalOperatorCount(node.right);
}

function hasNestedTernary(node: any): boolean {
  if (!isNode(node) || node.type !== "ConditionalExpression") return false;
  return (
    containsNode(node.consequent, "ConditionalExpression") || containsNode(node.alternate, "ConditionalExpression")
  );
}

function containsNode(node: any, type: string, visited = new Set<object>()): boolean {
  if (!isNode(node) || visited.has(node)) return false;
  visited.add(node);
  if (node.type === type) return true;
  for (const [key, value] of Object.entries(node)) {
    if (["parent", "loc", "range", "tokens", "comments"].includes(key)) continue;
    if (isNode(value) && containsNode(value, type, visited)) return true;
    if (Array.isArray(value) && value.some((item) => containsNode(item, type, visited))) return true;
  }
  return false;
}

function hasChainedCall(node: any): boolean {
  if (!isCallExpression(node) || !isMemberExpression(node.callee)) return false;
  return isCallExpression(node.callee.object) || isMemberExpression(node.callee.object);
}

function hasExternalCall(node: any): boolean {
  if (!isCallExpression(node)) return false;
  if (node.callee?.type === "Identifier" && node.callee.name === "cn") return false;
  if (isMemberExpression(node.callee)) return false;
  return node.callee?.type === "Identifier";
}

function findViolation(node: any): string | undefined {
  if (!isNode(node)) return undefined;

  if (node.type === "BinaryExpression" && ARITHMETIC_OPERATORS.has(node.operator)) {
    return "arithmetic";
  }
  if (hasChainedCall(node)) return "chained built-in method calls";
  if (hasExternalCall(node)) return "calls to functions declared outside the component";
  if (hasNestedTernary(node)) return "nested ternaries";
  if (logicalOperatorCount(node) >= 2) return "conditions containing two or more logical operators";

  return undefined;
}

export const jsxHygieneRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require complex JSX expressions to be extracted before return.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx") && !context.filename.endsWith(".jsx")) return {};

    function checkExpression(node: any): void {
      const violation = findViolation(node);
      if (!violation) return;
      context.report({
        node,
        message:
          `Extract ${violation} from JSX before return. ` +
          "See docs/code-organization-guide/rules/jsx-hygiene-rule.md",
      });
    }

    return {
      JSXExpressionContainer(node: any) {
        if (node.expression?.type === "JSXEmptyExpression") return;
        checkExpression(node.expression);
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- AST access is limited to the rule implementation above */
