/**
 * ESLint rule: pasika/prefer-enum
 *
 * A fixed set of named string or number values MUST be a TypeScript enum
 * instead of an object literal marked `as const`, a literal-union type alias,
 * an inline literal-union property type, or raw Zod discriminated-union discriminator literals.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type {
  CallExpressionNode,
  TsAsExpressionNode,
  TsPropertySignatureNode,
  TsTypeAliasDeclarationNode,
  TsTypeNode,
  VariableDeclaratorNode,
} from "../ast-types";
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

function isEnumLiteralType(node: TsTypeNode): boolean {
  if (node.type !== "TSLiteralType") return false;
  const value = node.literal?.value;
  return typeof value === "string" || typeof value === "number";
}

function isEnumLiteralUnion(node: TsTypeNode | undefined): boolean {
  return node?.type === "TSUnionType" && (node.types?.length ?? 0) >= 2 && (node.types ?? []).every(isEnumLiteralType);
}

function isZodCall(node: Pick<ESTree.CallExpression, "callee"> | CallExpressionNode, method: string): boolean {
  const { callee } = node;
  return (
    callee?.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.object.name === "z" &&
    callee.property.type === "Identifier" &&
    callee.property.name === method
  );
}

function propertyName(property: ESTree.Property): string | undefined {
  if (property.computed) return undefined;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return undefined;
}

function rawZodDiscriminantLiteral(
  schemaCall: ESTree.CallExpression,
  discriminator: string,
): ESTree.Literal | undefined {
  if (!isZodCall(schemaCall, "object")) return undefined;

  const shape = schemaCall.arguments[0];
  if (shape?.type !== "ObjectExpression") return undefined;

  for (const property of shape.properties) {
    if (property.type !== "Property" || propertyName(property) !== discriminator) continue;
    if (property.value.type !== "CallExpression" || !isZodCall(property.value, "literal")) return undefined;

    const literal = property.value.arguments[0];
    if (literal?.type === "Literal" && (typeof literal.value === "string" || typeof literal.value === "number")) {
      return literal;
    }

    return undefined;
  }

  return undefined;
}

export const preferEnumRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require fixed sets of named string/number values to be TypeScript enums, including Zod discriminated-union discriminator values.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    const objectSchemas = new Map<string, ESTree.CallExpression>();
    const discriminatedUnions: CallExpressionNode[] = [];
    const reportedDiscriminants = new Set<ESTree.Literal>();

    return {
      VariableDeclarator(node: VariableDeclaratorNode) {
        const { id, init } = node;
        if (id?.type !== "Identifier" || init?.type !== "CallExpression" || !isZodCall(init, "object")) return;

        objectSchemas.set(id.name, init);
      },
      CallExpression(node: CallExpressionNode) {
        if (isZodCall(node, "discriminatedUnion")) {
          discriminatedUnions.push(node);
        }
      },
      "Program:exit"() {
        for (const unionCall of discriminatedUnions) {
          const [discriminatorArg, optionsArg] = unionCall.arguments ?? [];
          if (
            discriminatorArg?.type !== "Literal" ||
            typeof discriminatorArg.value !== "string" ||
            optionsArg?.type !== "ArrayExpression"
          ) {
            continue;
          }

          for (const option of optionsArg.elements) {
            if (!option || option.type === "SpreadElement") continue;

            let schemaCall: ESTree.CallExpression | undefined;
            if (option.type === "Identifier") {
              schemaCall = objectSchemas.get(option.name);
            } else if (option.type === "CallExpression" && isZodCall(option, "object")) {
              schemaCall = option;
            }
            if (!schemaCall) continue;

            const literal = rawZodDiscriminantLiteral(schemaCall, discriminatorArg.value);
            if (!literal || reportedDiscriminants.has(literal)) continue;

            reportedDiscriminants.add(literal);
            context.report({
              node: literal,
              message:
                "A Zod discriminated-union discriminator literal must use a TypeScript enum member. See docs/next-codebase-guide/rules/constants-rule.md",
            });
          }
        }
      },
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
      TSTypeAliasDeclaration(node: TsTypeAliasDeclarationNode) {
        if (node.typeParameters || !isEnumLiteralUnion(node.typeAnnotation)) return;

        context.report({
          node,
          message:
            "A named union made only of string or number literals must be a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
      TSPropertySignature(node: TsPropertySignatureNode) {
        const typeAnnotation = node.typeAnnotation?.typeAnnotation;
        if (!isEnumLiteralUnion(typeAnnotation)) return;

        context.report({
          node,
          message:
            "A property whose type is a union made only of string or number literals must use a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
