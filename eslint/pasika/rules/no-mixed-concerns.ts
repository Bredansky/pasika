/**
 * ESLint rule: pasika/no-mixed-concerns
 *
 * Enforces the "No Mixed Concerns Rule" — one React component per .tsx file.
 *
 * @see docs/code-organization-guide/rules/no-mixed-concerns-rule.md
 */

import type { Rule } from "eslint";

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

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "FunctionDeclaration") {
          exportedComponentCount++;
          if (exportedComponentCount > 1) {
            extraExports.push({ name: node.declaration.id.name });
          }
        }
      },

      ExportDefaultDeclaration(node) {
        if (node.declaration.type === "FunctionDeclaration" && node.declaration.id) {
          exportedComponentCount++;
          if (exportedComponentCount > 1) {
            extraExports.push({ name: node.declaration.id.name });
          }
        }
      },

      "Program:exit"() {
        if (exportedComponentCount > 1) {
          for (const extra of extraExports) {
            context.report({
              loc: { line: 1, column: 0 },
              message:
                `File exports multiple components. "${extra.name}" is an extra component export. ` +
                `Move it to its own file. Each .tsx file MUST contain exactly one component. ` +
                `See docs/code-organization-guide/rules/no-mixed-concerns-rule.md`,
            });
          }
        }
      },
    };
  },
};
