/**
 * ESLint rule: pasika/no-redundant-alias
 *
 * Prevents declarations and object properties from introducing redundant
 * local names or inline identifier/member-expression mappings.
 *
 * @see docs/next-codebase-guide/rules/redundant-aliases-rule.md
 */
import path from "node:path";
import type { Rule, Scope } from "eslint";
import type { Identifier, MemberExpression, Node } from "estree";

const DOC = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";
const VALUE_SENTINELS = new Set(["undefined", "NaN", "Infinity"]);
const RESERVED_LOCAL_NAMES = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);
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

function objectPropertyMessage(propertyName: string, source: string, identifierValue: boolean): string {
  if (!identifierValue) {
    return `"${propertyName}" maps "${source}" inline. Bind it as "${propertyName}" before this object and use property shorthand. ${DOC}`;
  }
  if (source === propertyName) return `Use property shorthand for "${propertyName}". ${DOC}`;
  return `"${propertyName}" maps the local "${source}" inline. Rename the producer to "${propertyName}" and use property shorthand. ${DOC}`;
}

function findVariable(context: Rule.RuleContext, node: Identifier): Scope.Variable | undefined {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
}

function canUsePropertyNameAsLocal(name: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/u.test(name) && !RESERVED_LOCAL_NAMES.has(name);
}

function visibleVariable(context: Rule.RuleContext, node: Node, name: string): Scope.Variable | undefined {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
}

function memberRootIdentifier(node: MemberExpression): Identifier | undefined {
  let current: Node = node;
  while (current.type === "MemberExpression") current = current.object;
  return current.type === "Identifier" ? current : undefined;
}

function canBindMemberExpression(context: Rule.RuleContext, node: MemberExpression, targetName: string): boolean {
  if (visibleVariable(context, node, targetName)) return false;

  const root = memberRootIdentifier(node);
  if (!root) return true;
  if (/^[A-Z]/u.test(root.name)) return false;

  const variable = findVariable(context, root);
  return !variable?.defs.some((definition) => definition.type === "ImportBinding");
}

export const noRedundantAliasRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: {
      description: "Disallow redundant aliases and inline identifier/member-expression object mappings.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || node.init?.type !== "Identifier") return;

        const declaration = node.parent;
        if (declaration.type !== "VariableDeclaration" || declaration.kind !== "const") return;

        const exported = declaration.parent.type === "ExportNamedDeclaration";
        const frameworkRouteAlias =
          path.basename(context.filename) === "route.ts" && exported && HTTP_METHODS.has(node.id.name);
        if (frameworkRouteAlias || VALUE_SENTINELS.has(node.init.name)) return;

        context.report({
          node,
          message: aliasMessage(node.id.name, node.init.name),
        });
      },
      Property(node) {
        if (node.parent.type !== "ObjectExpression" || node.computed || node.key.type !== "Identifier") return;
        if (node.value.type !== "Identifier" && node.value.type !== "MemberExpression") return;

        const propertyName = node.key.name;
        if (!canUsePropertyNameAsLocal(propertyName)) return;

        const propertyValue = node.value;
        const source = context.sourceCode.getText(propertyValue);

        if (propertyValue.type === "Identifier") {
          if (node.shorthand) return;
        } else if (!canBindMemberExpression(context, propertyValue, propertyName)) {
          return;
        }

        context.report({
          node,
          message: objectPropertyMessage(propertyName, source, propertyValue.type === "Identifier"),
          fix(fixer) {
            return propertyValue.type === "Identifier" && propertyValue.name === propertyName
              ? fixer.replaceText(node, propertyName)
              : null;
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
