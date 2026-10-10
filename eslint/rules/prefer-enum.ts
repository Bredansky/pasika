/**
 * ESLint rule: pasika/prefer-enum
 *
 * A fixed set of named string or number values MUST be a TypeScript enum
 * instead of an object literal marked `as const`, a literal-union type alias,
 * an inline literal-union property type, enum-like const tuple declarations, or
 * raw Zod discriminated-union discriminator literals.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type {
  CallExpressionNode,
  TsAsExpressionNode,
  TsIndexedAccessTypeNode,
  TsPropertySignatureNode,
  TsTypeAliasDeclarationNode,
  TsTypeNode,
  VariableDeclaratorNode,
} from "../ast-types";
import { typedParserServices } from "./contract-ownership";
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

/**
 * A const tuple is a domain-enum substitute only when it is used to declare
 * a named Zod enum or a named indexed-access union. Ordinary tuples (ordering,
 * UI options, data rows) are intentionally not banned.
 */
function isLiteralTupleAssertion(node: TsAsExpressionNode): boolean {
  if (!isConstAssertion(node)) return false;
  const expression = node.expression;
  if (expression?.type !== "ArrayExpression" || expression.elements.length < 2) return false;
  const values = expression.elements.map((element) => {
    if (element?.type !== "Literal") return undefined;
    return typeof element.value === "string" || typeof element.value === "number" ? element.value : undefined;
  });
  return values.every((value) => value !== undefined) && new Set(values).size >= 2;
}

function isTsLiteralTupleDeclaration(declaration: ts.Declaration): boolean {
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
  const init = declaration.initializer;
  if (
    !ts.isAsExpression(init) ||
    !ts.isTypeReferenceNode(init.type) ||
    !ts.isIdentifier(init.type.typeName) ||
    init.type.typeName.text !== "const" ||
    !ts.isArrayLiteralExpression(init.expression) ||
    init.expression.elements.length < 2
  ) {
    return false;
  }
  const values = init.expression.elements.map((element) =>
    ts.isStringLiteral(element) || ts.isNumericLiteral(element) ? element.text : undefined,
  );
  return values.every((value) => value !== undefined) && new Set(values).size >= 2;
}

export const preferEnumRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require fixed sets of named string/number values to be TypeScript enums, including named Zod enum tuples and discriminated-union discriminator values.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    const objectSchemas = new Map<string, ESTree.CallExpression>();
    const literalTuples = new Set<string>();
    const enumTupleUses: { name: ESTree.Identifier; node: Rule.Node }[] = [];
    const discriminatedUnions: CallExpressionNode[] = [];
    const reportedDiscriminants = new Set<ESTree.Literal>();
    const services = typedParserServices(context.sourceCode.parserServices);

    function isTupleDomain(name: ESTree.Identifier): boolean {
      // The typed resolver follows imports and lexical shadowing. The local
      // name index is only a fallback for files linted without a TS program.
      if (!services) return literalTuples.has(name.name);

      const tsNode = services.esTreeNodeToTSNodeMap.get(name);
      if (!tsNode) return false;
      const checker = services.program.getTypeChecker();
      const symbol = checker.getSymbolAtLocation(tsNode);
      if (!symbol) return false;
      const original = symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return (original.declarations ?? []).some(isTsLiteralTupleDeclaration);
    }

    return {
      VariableDeclarator(node: VariableDeclaratorNode) {
        const { id, init } = node;
        if (id?.type !== "Identifier" || !init) return;
        if (init.type === "CallExpression" && isZodCall(init, "object")) {
          objectSchemas.set(id.name, init);
        }
      },
      CallExpression(node: CallExpressionNode) {
        if (isZodCall(node, "discriminatedUnion")) {
          discriminatedUnions.push(node);
        }
        const argument = node.arguments?.[0];
        if (isZodCall(node, "enum") && argument?.type === "Identifier") {
          enumTupleUses.push({ name: argument, node });
        }
      },
      TSIndexedAccessType(node: TsIndexedAccessTypeNode) {
        const { objectType, indexType } = node;
        if (
          objectType?.type === "TSTypeQuery" &&
          objectType.exprName?.type === "Identifier" &&
          indexType?.type === "TSNumberKeyword"
        ) {
          enumTupleUses.push({ name: objectType.exprName, node });
        }
      },
      "Program:exit"() {
        const reportedTuples = new Set<string>();
        for (const use of enumTupleUses) {
          if (reportedTuples.has(use.name.name) || !isTupleDomain(use.name)) continue;
          reportedTuples.add(use.name.name);
          context.report({
            node: use.node,
            message:
              "A const tuple used as a named enum domain must be replaced with a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
          });
        }

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

        if (isLiteralTupleAssertion(node) && node.parent?.type === "VariableDeclarator") {
          const { id } = node.parent;
          if (id.type === "Identifier") literalTuples.add(id.name);
        }

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
