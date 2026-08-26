/**
 * ESLint rule: pasika/jsx-hygiene
 *
 * Keeps calculations and complex conditions out of JSX children and attributes.
 *
 * @see docs/code-organization-guide/rules/jsx-hygiene-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";

const ARITHMETIC_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

function isCallExpression(node: ESTree.Node): node is ESTree.CallExpression {
  return node.type === "CallExpression";
}

function isMemberExpression(node: ESTree.Node): node is ESTree.MemberExpression {
  return ["MemberExpression", "OptionalMemberExpression"].includes(node.type);
}

function logicalOperatorCount(node: ESTree.Node): number {
  if (node.type !== "LogicalExpression") return 0;
  return 1 + logicalOperatorCount(node.left) + logicalOperatorCount(node.right);
}

/**
 * Whether the parsed text of a node's subtree contains a conditional expression
 * anywhere. Re-parses just the node's source slice with the TypeScript compiler
 * so the walk stays fully typed, including inside JSX children.
 */
function containsConditionalIn(node: ESTree.Expression, sourceText: string): boolean {
  const start = node.range?.[0] ?? 0;
  const end = node.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "fragment.tsx",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isConditionalExpression(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(sourceFile);
  return found;
}

function hasNestedTernary(node: ESTree.Node, sourceText: string): boolean {
  if (node.type !== "ConditionalExpression") return false;
  return containsConditionalIn(node.consequent, sourceText) || containsConditionalIn(node.alternate, sourceText);
}

function hasChainedCall(node: ESTree.Node): boolean {
  if (!isCallExpression(node) || !isMemberExpression(node.callee)) return false;
  return isCallExpression(node.callee.object) || isMemberExpression(node.callee.object);
}

function hasExternalCall(node: ESTree.Node): boolean {
  if (!isCallExpression(node)) return false;
  const callee = node.callee;
  if (callee.type === "Identifier" && callee.name === "cn") return false;
  if (isMemberExpression(callee)) return false;
  return callee.type === "Identifier";
}

function findViolation(node: ESTree.Node, sourceText: string): string | undefined {
  if (node.type === "BinaryExpression" && ARITHMETIC_OPERATORS.has(node.operator)) {
    return "arithmetic";
  }
  if (hasChainedCall(node)) return "chained built-in method calls";
  if (hasExternalCall(node)) return "calls to functions declared outside the component";
  if (hasNestedTernary(node, sourceText)) return "nested ternaries";
  if (logicalOperatorCount(node) >= 2) return "conditions containing two or more logical operators";

  return undefined;
}

/** JSXExpressionContainer plus the parser-specific JSXEmptyExpression shape. */
type JsxExpressionContainerNode = Rule.Node & {
  expression?: ESTree.Expression | { type: "JSXEmptyExpression" };
};

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
    const sourceText = context.sourceCode.text;

    function checkExpression(node: ESTree.Expression): void {
      const violation = findViolation(node, sourceText);
      if (!violation) return;
      context.report({
        node,
        message:
          `Extract ${violation} from JSX before return. ` +
          "See docs/code-organization-guide/rules/jsx-hygiene-rule.md",
      });
    }

    return {
      JSXExpressionContainer(node: JsxExpressionContainerNode) {
        const expression = node.expression;
        if (!expression || expression.type === "JSXEmptyExpression") return;
        checkExpression(expression);
      },
    };
  },
};
