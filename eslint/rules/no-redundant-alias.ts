/**
 * ESLint rule: pasika/no-redundant-alias
 *
 * Prevents declarations and bindings from introducing redundant local
 * names while keeping cross-object mappings explicit at object boundaries.
 *
 * @see docs/next-codebase-guide/rules/redundant-aliases-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

const DOC = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";
const VALUE_SENTINELS = new Set(["undefined", "NaN", "Infinity"]);
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const PRIMITIVE_TYPE_NAMES: Readonly<Record<string, string>> = {
  TSBigIntKeyword: "bigint",
  TSBooleanKeyword: "boolean",
  TSNullKeyword: "null",
  TSNumberKeyword: "number",
  TSStringKeyword: "string",
  TSSymbolKeyword: "symbol",
  TSUndefinedKeyword: "undefined",
};

type TsEntityName =
  | { type: "Identifier"; name: string }
  | { type: "TSQualifiedName"; left: TsEntityName; right: { type: "Identifier"; name: string } }
  | {
      type: "MemberExpression";
      object: TsEntityName;
      property: { type: "Identifier"; name: string };
    };

type TsTypeAnnotationNode = Omit<Rule.Node, "type"> & {
  type: string;
  typeName?: TsEntityName;
  typeArguments?: Rule.Node;
};

type TsTypeAliasDeclarationNode = Rule.Node & {
  id?: { name?: string };
  typeAnnotation?: TsTypeAnnotationNode;
  typeParameters?: Rule.Node;
};

interface TsInterfaceHeritageNode {
  expression: TsEntityName;
  typeArguments?: Rule.Node;
}

type TsInterfaceDeclarationNode = Rule.Node & {
  id?: { name?: string };
  body?: { body?: Rule.Node[] };
  extends?: TsInterfaceHeritageNode[];
  typeParameters?: Rule.Node;
};

function entityNameText(name: TsEntityName): string | undefined {
  if (name.type === "Identifier") return name.name;
  if (name.type === "TSQualifiedName") {
    const left = entityNameText(name.left);
    const right = name.right.name;
    return left && right ? `${left}.${right}` : undefined;
  }

  const object = entityNameText(name.object);
  const property = name.property.name;
  return object && property ? `${object}.${property}` : undefined;
}
function aliasedTypeName(annotation: TsTypeAnnotationNode): string | undefined {
  const primitiveTypeName = PRIMITIVE_TYPE_NAMES[annotation.type];
  if (primitiveTypeName) return primitiveTypeName;
  if (annotation.type !== "TSTypeReference" || annotation.typeArguments || !annotation.typeName) return undefined;

  return entityNameText(annotation.typeName);
}

function aliasMessage(alias: string | undefined, source: string | undefined): string {
  const aliasName = alias ?? "This declaration";
  const sourceName = source ?? "the original symbol";
  return `"${aliasName}" only renames "${sourceName}". Use "${sourceName}" directly or rename the original symbol and its consumers. ${DOC}`;
}

function bindingAliasMessage(alias: string, source: string): string {
  return `"${alias}" renames "${source}" while creating a binding. Keep the original name and map it only at the object boundary. ${DOC}`;
}

function objectPropertyMessage(propertyName: string, source: string): string {
  if (source === propertyName) return `Use property shorthand for "${propertyName}". ${DOC}`;
  return `"${propertyName}" maps the local "${source}". Keep the local name or map directly from its source object instead. ${DOC}`;
}

export const noRedundantAliasRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: {
      description: "Disallow renamed bindings while allowing explicit cross-object property mappings.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !node.init) return;

        const declaration = node.parent;
        if (declaration.type !== "VariableDeclaration" || declaration.kind !== "const") return;

        if (node.init.type === "Identifier") {
          const exported = declaration.parent.type === "ExportNamedDeclaration";
          const frameworkRouteAlias =
            path.basename(context.filename) === "route.ts" && exported && HTTP_METHODS.has(node.id.name);
          if (frameworkRouteAlias || VALUE_SENTINELS.has(node.init.name)) return;

          context.report({
            node,
            message: aliasMessage(node.id.name, node.init.name),
          });
          return;
        }

        if (node.init.type !== "MemberExpression") return;

        let propertyName: string | undefined;
        if (!node.init.computed && node.init.property.type === "Identifier") {
          propertyName = node.init.property.name;
        }
        if (
          node.init.computed &&
          node.init.property.type === "Literal" &&
          typeof node.init.property.value === "string"
        ) {
          propertyName = node.init.property.value;
        }
        if (propertyName === undefined || propertyName === node.id.name) return;

        context.report({
          node,
          message: bindingAliasMessage(node.id.name, context.sourceCode.getText(node.init)),
        });
      },
      Property(node) {
        if (node.computed) return;

        let propertyName: string | undefined;
        if (node.key.type === "Identifier") propertyName = node.key.name;
        if (node.key.type === "Literal" && typeof node.key.value === "string") {
          propertyName = node.key.value;
        }
        if (propertyName === undefined) return;

        if (node.parent.type === "ObjectPattern") {
          let binding;
          if (node.value.type === "Identifier") binding = node.value;
          if (node.value.type === "AssignmentPattern" && node.value.left.type === "Identifier") {
            binding = node.value.left;
          }
          if (!binding || binding.name === propertyName) return;

          context.report({
            node,
            message: bindingAliasMessage(binding.name, propertyName),
          });
          return;
        }

        if (node.parent.type !== "ObjectExpression" || node.value.type !== "Identifier") return;
        if (node.shorthand) return;

        const source = node.value.name;

        context.report({
          node,
          message: objectPropertyMessage(propertyName, source),
          fix(fixer) {
            return propertyName === source ? fixer.replaceText(node, propertyName) : null;
          },
        });
      },

      TSTypeAliasDeclaration(node: TsTypeAliasDeclarationNode) {
        if (node.typeParameters) return;
        const annotation = node.typeAnnotation;
        if (!annotation) return;

        const source = aliasedTypeName(annotation);
        if (!source) return;

        context.report({
          node,
          message: aliasMessage(node.id?.name, source),
        });
      },

      ImportSpecifier(node) {
        if (node.imported.type !== "Identifier" || node.imported.name === node.local.name) return;

        context.report({
          node,
          message: bindingAliasMessage(node.local.name, node.imported.name),
        });
      },

      ExportNamedDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (specifier.local.type !== "Identifier" || specifier.exported.type !== "Identifier") continue;

          const source = specifier.local.name;
          const alias = specifier.exported.name;
          if (source === alias) continue;

          const frameworkRouteAlias = path.basename(context.filename) === "route.ts" && HTTP_METHODS.has(alias);
          if (frameworkRouteAlias) continue;

          context.report({
            node: specifier,
            message: aliasMessage(alias, source),
          });
        }
      },

      TSInterfaceDeclaration(node: TsInterfaceDeclarationNode) {
        if (node.typeParameters || node.body?.body?.length !== 0 || node.extends?.length !== 1) return;

        for (const heritage of node.extends) {
          if (heritage.typeArguments) return;

          const source = entityNameText(heritage.expression);
          if (!source) return;

          context.report({
            node,
            message: aliasMessage(node.id?.name, source),
          });
        }
      },
    };
  },
};
