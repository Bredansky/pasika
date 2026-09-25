/**
 * ESLint rule: pasika/no-literal-inline-style
 *
 * Enforces the "Inline Style Rule" — static styling belongs in Tailwind.
 * Runtime-sourced inline values remain allowed.
 *
 * @see docs/next-tailwind-guide/rules/inline-style-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

interface JsxExpressionContainer {
  type: "JSXExpressionContainer";
  expression: ESTree.Expression | null;
}

type JsxAttributeNode = Rule.Node & {
  name?: { name?: unknown };
  value?: ESTree.Literal | JsxExpressionContainer | null;
};

function isStaticValue(value: ESTree.Expression | ESTree.Pattern): boolean {
  if (value.type === "Literal") {
    return typeof value.value === "string" || typeof value.value === "number" || typeof value.value === "boolean";
  }

  if (value.type === "TemplateLiteral") {
    return value.expressions.length === 0;
  }

  if (
    value.type === "UnaryExpression" &&
    (value.operator === "-" || value.operator === "+") &&
    value.argument.type === "Literal"
  ) {
    return true;
  }

  if (value.type === "ConditionalExpression") {
    return isStaticValue(value.consequent) || isStaticValue(value.alternate);
  }

  if (value.type === "LogicalExpression") {
    return isStaticValue(value.left) || isStaticValue(value.right);
  }

  return false;
}

function propertyName(property: ESTree.Property): string | undefined {
  if (!property.computed && property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return undefined;
}

function findStaticDeclaration(expression: ESTree.ObjectExpression): string | undefined {
  for (const property of expression.properties) {
    if (property.type !== "Property" || property.kind !== "init") continue;
    const name = propertyName(property);
    if (!name) continue;
    if (isStaticValue(property.value)) return name;
  }
  return undefined;
}

function findStaticStyle(expression: ESTree.Expression): string | undefined {
  if (expression.type === "ObjectExpression") return findStaticDeclaration(expression);
  if (expression.type === "ConditionalExpression") {
    return findStaticStyle(expression.consequent) ?? findStaticStyle(expression.alternate);
  }
  if (expression.type === "LogicalExpression") {
    return findStaticStyle(expression.left) ?? findStaticStyle(expression.right);
  }
  return undefined;
}

export const noLiteralInlineStyleRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow static CSS declarations in JSX style attributes.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node: JsxAttributeNode) {
        if (node.name?.name !== "style" || node.value?.type !== "JSXExpressionContainer") return;

        const expression = node.value.expression;
        if (!expression) return;

        const name = findStaticStyle(expression);
        if (!name) return;

        context.report({
          node,
          message:
            `Static inline style "${name}" should use Tailwind. ` +
            "Keep inline styles for runtime-sourced values. " +
            "See docs/next-tailwind-guide/rules/inline-style-rule.md",
        });
      },
    };
  },
};
