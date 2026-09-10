/**
 * ESLint rule: pasika/prefer-enum
 *
 * A fixed set of named string or number values MUST be a TypeScript enum
 * instead of an object literal marked `as const`.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { TsAsExpressionNode } from "../ast-types";
import { sourceRootOf } from "./project-root";

function isConstAssertion(node: TsAsExpressionNode): boolean {
  const typeAnnotation = node.typeAnnotation;
  return (
    typeAnnotation?.type === "TSTypeReference" &&
    typeAnnotation.typeName?.type === "Identifier" &&
    typeAnnotation.typeName.name === "const"
  );
}

/** True when a property's value is exactly what an enum member's initializer allows. */
function isEnumConvertibleProperty(property: ESTree.Property | ESTree.SpreadElement): boolean {
  if (property.type !== "Property" || property.computed) return false;
  const { value } = property;
  return value.type === "Literal" && (typeof value.value === "string" || typeof value.value === "number");
}

export const preferEnumRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a fixed set of named string/number values to be a TypeScript enum, not an `as const` object literal.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    return {
      TSAsExpression(node: TsAsExpressionNode) {
        if (!isConstAssertion(node)) return;

        const expression = node.expression;
        if (!expression || expression.type !== "ObjectExpression") return;
        if (expression.properties.length === 0) return;
        if (!expression.properties.every(isEnumConvertibleProperty)) return;

        context.report({
          node,
          message:
            "A fixed set of named values must be a TypeScript enum, not an object literal marked as const. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
