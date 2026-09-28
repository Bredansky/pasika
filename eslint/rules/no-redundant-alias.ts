/**
 * ESLint rule: pasika/no-redundant-alias
 *
 * Prevents variable, type, and empty-interface declarations from creating a
 * second name for an existing symbol without adding behavior or type structure.
 *
 * @see docs/next-codebase-guide/rules/symbol-aliases-rule.md
 */
import type { Rule } from "eslint";
import type * as ESTree from "estree";

const DOC = "See docs/next-codebase-guide/rules/symbol-aliases-rule.md";
const VALUE_SENTINELS = new Set(["undefined", "NaN", "Infinity"]);

type TsEntityName =
  | { type?: "Identifier"; name?: string }
  | { type?: "TSQualifiedName"; left?: TsEntityName; right?: { type?: "Identifier"; name?: string } }
  | {
      type?: "MemberExpression";
      computed?: boolean;
      object?: TsEntityName;
      property?: { type?: "Identifier"; name?: string };
    };

type TsTypeReferenceNode = Omit<Rule.Node, "type"> & {
  type: string;
  typeName?: TsEntityName;
  typeArguments?: Rule.Node;
};
type TsTypeAliasDeclarationNode = Rule.Node & {
  id?: { name?: string };
  typeAnnotation?: TsTypeReferenceNode;
  typeParameters?: Rule.Node;
};

interface TsInterfaceHeritageNode {
  expression?: TsEntityName;
  typeArguments?: Rule.Node;
}

type TsInterfaceDeclarationNode = Rule.Node & {
  id?: { name?: string };
  body?: { body?: Rule.Node[] };
  extends?: TsInterfaceHeritageNode[];
  typeParameters?: Rule.Node;
};

function entityNameText(name: TsEntityName | undefined): string | undefined {
  if (!name) return undefined;
  if (name.type === "Identifier") return name.name;
  if (name.type === "TSQualifiedName") {
    const left = entityNameText(name.left);
    const right = name.right?.name;
    return left && right ? `${left}.${right}` : undefined;
  }

  if (name.type === "MemberExpression" && !name.computed) {
    const object = entityNameText(name.object);
    const property = name.property?.name;
    return object && property ? `${object}.${property}` : undefined;
  }

  return undefined;
}
function aliasMessage(alias: string | undefined, source: string | undefined): string {
  const aliasName = alias ?? "This declaration";
  const sourceName = source ?? "the original symbol";
  return `"${aliasName}" only renames "${sourceName}". Use "${sourceName}" directly or rename the original symbol and its consumers. ${DOC}`;
}

export const noRedundantAliasRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow declarations that only give an existing symbol a second name.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        if (node.id.type !== "Identifier" || node.init?.type !== "Identifier") return;
        if (VALUE_SENTINELS.has(node.init.name)) return;

        context.report({
          node,
          message: aliasMessage(node.id.name, node.init.name),
        });
      },
      TSTypeAliasDeclaration(node: TsTypeAliasDeclarationNode) {
        if (node.typeParameters) return;
        const annotation = node.typeAnnotation;
        if (annotation?.type !== "TSTypeReference" || annotation.typeArguments) return;

        const source = entityNameText(annotation.typeName);
        if (!source) return;

        context.report({
          node,
          message: aliasMessage(node.id?.name, source),
        });
      },

      TSInterfaceDeclaration(node: TsInterfaceDeclarationNode) {
        if (node.typeParameters || node.body?.body?.length !== 0 || node.extends?.length !== 1) return;

        const heritage = node.extends[0];
        if (heritage?.typeArguments) return;

        const source = entityNameText(heritage?.expression);
        if (!source) return;

        context.report({
          node,
          message: aliasMessage(node.id?.name, source),
        });
      },
    };
  },
};
