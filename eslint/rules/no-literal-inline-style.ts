/**
 * ESLint rule: pasika/no-literal-inline-style
 *
 * Enforces the "Inline Style Rule" — simple static browser CSS declarations
 * belong in Tailwind's utility/token API. Runtime-sourced and genuinely
 * complicated inline values remain allowed, as do non-browser ImageResponse trees.
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

const COMPLEX_VALUE_PROPERTIES = new Set([
  "background",
  "backgroundImage",
  "backgroundSize",
  "boxShadow",
  "clipPath",
  "filter",
  "gridTemplateColumns",
  "gridTemplateRows",
  "textShadow",
  "willChange",
]);

function propertyName(property: ESTree.Property): string | undefined {
  if (property.computed) return undefined;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return undefined;
}

function isComplicatedStaticValue(name: string, value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("\n")) return true;
  if (/\b(?:calc|min|max|clamp)\(/u.test(trimmed)) return true;
  return COMPLEX_VALUE_PROPERTIES.has(name) && /[\s(]/u.test(trimmed);
}

function isSimpleStaticValue(name: string, value: ESTree.Expression | ESTree.Pattern): boolean {
  if (value.type === "Literal") {
    if (typeof value.value === "string") return !isComplicatedStaticValue(name, value.value);
    return typeof value.value === "number" || typeof value.value === "boolean";
  }

  if (value.type === "TemplateLiteral") {
    return (
      value.expressions.length === 0 &&
      !isComplicatedStaticValue(name, value.quasis.map((quasi) => quasi.value.raw).join(""))
    );
  }

  if (
    value.type === "UnaryExpression" &&
    (value.operator === "-" || value.operator === "+") &&
    value.argument.type === "Literal"
  ) {
    return true;
  }

  if (value.type === "ConditionalExpression") {
    return isSimpleStaticValue(name, value.consequent) || isSimpleStaticValue(name, value.alternate);
  }

  if (value.type === "LogicalExpression") {
    return isSimpleStaticValue(name, value.left) || isSimpleStaticValue(name, value.right);
  }

  return false;
}

function findSimpleStaticDeclaration(expression: ESTree.ObjectExpression): string | undefined {
  for (const property of expression.properties) {
    if (property.type !== "Property" || property.kind !== "init") continue;
    const name = propertyName(property);
    if (!name) continue;
    if (isSimpleStaticValue(name, property.value)) return name;
  }
  return undefined;
}

function findSimpleStaticStyle(expression: ESTree.Expression): string | undefined {
  if (expression.type === "ObjectExpression") return findSimpleStaticDeclaration(expression);
  if (expression.type === "ConditionalExpression") {
    return findSimpleStaticStyle(expression.consequent) ?? findSimpleStaticStyle(expression.alternate);
  }
  if (expression.type === "LogicalExpression") {
    return findSimpleStaticStyle(expression.left) ?? findSimpleStaticStyle(expression.right);
  }
  return undefined;
}

function isInsideImageResponse(node: Rule.Node, imageResponseNames: ReadonlySet<string>): boolean {
  let current: Rule.Node = node;
  const visited = new Set<Rule.Node>();

  while (!visited.has(current)) {
    visited.add(current);
    const parent = current.parent;
    if (!parent) return false;

    if (
      parent.type === "NewExpression" &&
      parent.callee.type === "Identifier" &&
      imageResponseNames.has(parent.callee.name)
    ) {
      return true;
    }

    current = parent;
  }

  return false;
}

export const noLiteralInlineStyleRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow simple static CSS declarations in JSX style attributes.",
    },
  },
  create(context) {
    const imageResponseNames = new Set<string>();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "next/og" && node.source.value !== "next/server") return;

        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "ImageResponse"
          ) {
            imageResponseNames.add(specifier.local.name);
          }
        }
      },

      JSXAttribute(node: JsxAttributeNode) {
        if (node.name?.name !== "style" || node.value?.type !== "JSXExpressionContainer") return;
        if (isInsideImageResponse(node, imageResponseNames)) return;

        const expression = node.value.expression;
        if (!expression) return;

        const name = findSimpleStaticStyle(expression);
        if (!name) return;

        context.report({
          node,
          message:
            `Simple static inline style "${name}" should use Tailwind utilities, theme tokens, or a named custom utility. ` +
            "Keep inline styles for runtime-sourced values or complicated values that are harder to read as classes. " +
            "See docs/next-tailwind-guide/rules/inline-style-rule.md",
        });
      },
    };
  },
};
