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

function isExportedVariable(context: Rule.RuleContext, variable: Scope.Variable): boolean {
  return variable.defs.some(
    (definition) =>
      definition.type === "Variable" &&
      context.sourceCode.getAncestors(definition.parent).at(-1)?.type === "ExportNamedDeclaration",
  );
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

function canRenameIdentifierProducer(context: Rule.RuleContext, node: Identifier, targetName: string): boolean {
  const variable = findVariable(context, node);
  if (!variable || isExportedVariable(context, variable)) return false;
  const targetVariable = visibleVariable(context, node, targetName);
  if (targetVariable && targetVariable !== variable) return false;

  const definition = variable.defs[0];
  if (!definition || variable.defs.length !== 1) return false;
  if (definition.type === "ImportBinding") return false;
  if (definition.type === "Variable" && definition.parent.kind !== "const") return false;
  if (definition.type !== "Variable" && definition.type !== "Parameter") return false;

  return variable.references.filter((reference) => reference.isRead()).length === 1;
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

function listStatement(node: Rule.Node): Rule.Node | undefined {
  let current: Rule.Node = node;
  while (current.parent && current.parent.type !== "Program" && current.parent.type !== "BlockStatement") {
    current = current.parent;
  }
  return current.parent ? current : undefined;
}

function identifierPropertyFixes(
  context: Rule.RuleContext,
  node: Rule.Node,
  value: Identifier,
  propertyName: string,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  if (value.name === propertyName) return [fixer.replaceText(node, propertyName)];

  const variable = findVariable(context, value);
  if (!variable) return [];

  return [
    ...variable.identifiers.map((identifier) => fixer.replaceText(identifier, propertyName)),
    fixer.replaceText(node, propertyName),
  ];
}

function memberPropertyFixes(
  context: Rule.RuleContext,
  node: Rule.Node,
  value: MemberExpression,
  propertyName: string,
  source: string,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const statement = listStatement(node);
  if (!statement) return [];

  const root = memberRootIdentifier(value);
  const rootVariable = root ? findVariable(context, root) : undefined;
  if (
    rootVariable?.defs.some((definition) => {
      const [statementStart, statementEnd] = context.sourceCode.getRange(statement);
      const [definitionStart, definitionEnd] = context.sourceCode.getRange(definition.node);
      return definitionStart >= statementStart && definitionEnd <= statementEnd;
    })
  ) {
    return [];
  }

  return [
    fixer.insertTextBefore(statement, `const ${propertyName} = ${source};\n`),
    fixer.replaceText(node, propertyName),
  ];
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
        const propertyValue = node.value;
        const source = context.sourceCode.getText(propertyValue);

        if (propertyValue.type === "Identifier") {
          if (node.shorthand) return;
          if (source !== propertyName && !canRenameIdentifierProducer(context, propertyValue, propertyName)) return;
        } else if (!canBindMemberExpression(context, propertyValue, propertyName)) {
          return;
        }

        context.report({
          node,
          message: objectPropertyMessage(propertyName, source, propertyValue.type === "Identifier"),
          fix(fixer) {
            return propertyValue.type === "Identifier"
              ? identifierPropertyFixes(context, node, propertyValue, propertyName, fixer)
              : memberPropertyFixes(context, node, propertyValue, propertyName, source, fixer);
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
