/**
 * ESLint rule: pasika/no-as-const
 *
 * Prefer explicit types and real enum domains to const assertions.
 * Multi-member const-asserted enum objects are already reported by
 * pasika/prefer-enum, so avoid duplicate diagnostics for that shape.
 *
 * @see docs/next-codebase-guide/rules/types-and-schemas-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { TsAsExpressionNode } from "../ast-types";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/types-and-schemas-rule.md";
const MESSAGE = `Do not use as const assertions; use an explicit type, satisfies, a named constant, or a TypeScript enum. ${DOC}`;

function isConstAssertion(node: TsAsExpressionNode): boolean {
  const annotation = node.typeAnnotation;
  return (
    annotation?.type === "TSTypeReference" &&
    annotation.typeName?.type === "Identifier" &&
    annotation.typeName.name === "const"
  );
}

/** This particular shape has a more precise diagnostic in prefer-enum. */
function isFixedEnumObject(expression: ESTree.Expression | undefined): boolean {
  return (
    expression?.type === "ObjectExpression" &&
    expression.properties.length >= 2 &&
    expression.properties.every(
      (property) =>
        property.type === "Property" &&
        !property.computed &&
        property.value.type === "Literal" &&
        (typeof property.value.value === "string" || typeof property.value.value === "number"),
    )
  );
}

export const noAsConstRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Prohibit TypeScript const assertions in application source." },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!file.startsWith(sourceRoot + path.sep)) return {};

    return {
      TSAsExpression(node: TsAsExpressionNode) {
        if (!isConstAssertion(node) || isFixedEnumObject(node.expression)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
};
