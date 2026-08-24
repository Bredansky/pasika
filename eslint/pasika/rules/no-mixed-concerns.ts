/**
 * ESLint rule: pasika/no-mixed-concerns
 *
 * Enforces the "No Mixed Concerns Rule" — one React component per .tsx file.
 *
 * @see docs/code-organization-guide/rules/no-mixed-concerns-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

/**
 * Return the name of an export node so we can report it clearly.
 * Handles:
 *   export function Foo() { }
 *   export const Foo = () => { }
 *   export const Foo = function () { }
 *   export default function Foo() { }
 *   export default () => { }
 */
// biome-ignore lint/suspicious/noExplicitAny: AST node type from ESLint with dynamic property access
function getExportName(declaration: any): string | null {
  if (declaration.type === "FunctionDeclaration" && declaration.id) {
    return declaration.id.name;
  }
  if (declaration.type === "VariableDeclaration") {
    const declarator = declaration.declarations[0];
    if (
      declarator?.id.type === "Identifier" &&
      (declarator.init?.type === "ArrowFunctionExpression" || declarator.init?.type === "FunctionExpression")
    ) {
      return declarator.id.name;
    }
  }
  if (declaration.type === "ArrowFunctionExpression") {
    return "default";
  }
  if (declaration.type === "FunctionExpression" && declaration.id) {
    return declaration.id.name;
  }
  return null;
}

export const noMixedConcernsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce one exported React component per .tsx file.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx")) return {};

    let exportedComponentCount = 0;
    const extraExports: { name: string }[] = [];

    function registerExport(name: string): void {
      exportedComponentCount++;
      if (exportedComponentCount > 1) {
        extraExports.push({ name });
      }
    }

    return {
      ExportNamedDeclaration(node: any) {
        if (!node.declaration) return;
        const name = getExportName(node.declaration);
        if (name) registerExport(name);
      },

      ExportDefaultDeclaration(node: any) {
        const name = getExportName(node.declaration);
        if (name) registerExport(name);
      },

      "Program:exit"() {
        if (exportedComponentCount > 1) {
          for (const extra of extraExports) {
            context.report({
              loc: { line: 1, column: 0 },
              message:
                `File exports multiple components. "${extra.name}" is an extra component export. ` +
                "Move it to its own file. Each .tsx file MUST contain exactly one component. " +
                "See docs/code-organization-guide/rules/no-mixed-concerns-rule.md",
            });
          }
        }
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any -- re-enable after AST node access block */
