/**
 * ESLint rule: pasika/schema-casing
 *
 * A Zod schema constant's name MUST be camelCase.
 *
 * @see docs/next-codebase-guide/rules/types-and-schemas-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { sourceRootOf } from "./project-root";

function isCamelCase(name: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

/** Walks a `z.object({...}).extend({...})`-style chain down to its root identifier. */
function rootIdentifierName(node: ESTree.Expression | ESTree.Super): string | undefined {
  let current: ESTree.Expression | ESTree.Super = node;
  for (;;) {
    if (current.type === "Identifier") return current.name;
    if (current.type === "CallExpression") {
      current = current.callee;
      continue;
    }
    if (current.type === "MemberExpression") {
      current = current.object;
      continue;
    }
    return undefined;
  }
}

export const schemaCasingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a Zod schema constant to be named in camelCase.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    let zodLocalName: string | undefined;

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "zod") return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "z"
          ) {
            zodLocalName = specifier.local.name;
          }
        }
      },
      VariableDeclarator(node) {
        if (!zodLocalName) return;
        if (node.id.type !== "Identifier") return;
        const declaration = node.parent;
        if (declaration.type !== "VariableDeclaration" || declaration.kind !== "const") return;

        const container = declaration.parent;
        const isModuleLevel =
          container.type === "Program" ||
          (container.type === "ExportNamedDeclaration" && container.parent.type === "Program");
        if (!isModuleLevel) return;

        if (!node.init || rootIdentifierName(node.init) !== zodLocalName) return;

        const { name } = node.id;
        if (isCamelCase(name)) return;

        context.report({
          node,
          message: `${name} must be camelCase. See docs/next-codebase-guide/rules/types-and-schemas-rule.md`,
        });
      },
    };
  },
};
