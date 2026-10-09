/**
 * ESLint rule: pasika/no-mixed-concerns
 *
 * Enforces one React component and one exported runtime value per .tsx file.
 * A component is an uppercase-named function or constant that renders JSX,
 * whether it is exported or kept private, so a file that defines a second
 * component of either kind must move it to its own file.
 *
 * @see docs/next-codebase-guide/rules/no-mixed-concerns-rule.md
 */

import type { Rule } from "eslint";
import { parseComponentInfo } from "./component-conventions";

export const noMixedConcernsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce one React component and one exported runtime value per .tsx file.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx")) return {};

    const sourceCode = context.sourceCode.text;

    return {
      "Program:exit"() {
        const components = parseComponentInfo(sourceCode, context.filename, { includeNonExported: true });
        if (components.length === 0) return;

        for (const extra of components.slice(1)) {
          context.report({
            loc: { line: 1, column: 0 },
            message:
              `File defines multiple components. "${extra.name}" is an extra component. ` +
              "Move it to its own file. Each component file MUST define exactly one component. " +
              "See docs/next-codebase-guide/rules/no-mixed-concerns-rule.md",
          });
        }
        if (components.length > 1) return;

        const componentName = components[0]?.name;
        if (!componentName) return;
        const isNextPageOrLayout = /(?:^|[/\\])src[/\\]app[/\\](?:[^/\\]+[/\\])*(?:page|layout)\.tsx$/.test(
          context.filename,
        );
        for (const statement of context.sourceCode.ast.body) {
          if (statement.type === "ExportNamedDeclaration") {
            if (/^export\s+(?:type|interface)\b/.test(context.sourceCode.getText(statement))) continue;
            const declaration = statement.declaration;
            if (
              isNextPageOrLayout &&
              declaration?.type === "VariableDeclaration" &&
              declaration.declarations.every(
                (item) => item.id.type === "Identifier" && (item.id.name === "metadata" || item.id.name === "viewport"),
              )
            ) {
              continue;
            }
            if (
              isNextPageOrLayout &&
              declaration?.type === "FunctionDeclaration" &&
              (declaration.id.name === "generateMetadata" || declaration.id.name === "generateViewport")
            ) {
              continue;
            }
            if (declaration?.type === "FunctionDeclaration" && declaration.id.name === componentName) continue;
            if (
              declaration?.type === "VariableDeclaration" &&
              declaration.declarations.length === 1 &&
              declaration.declarations[0]?.id.type === "Identifier" &&
              declaration.declarations[0].id.name === componentName
            ) {
              continue;
            }
            if (
              !declaration &&
              statement.specifiers.every(
                (specifier) =>
                  /^type\b/.test(context.sourceCode.getText(specifier)) ||
                  (!statement.source &&
                    specifier.local.type === "Identifier" &&
                    specifier.local.name === componentName),
              )
            ) {
              continue;
            }
          } else if (statement.type === "ExportAllDeclaration") {
            if (/^export\s+type\b/.test(context.sourceCode.getText(statement))) continue;
          } else if (statement.type === "ExportDefaultDeclaration") {
            if (statement.declaration.type === "Identifier" && statement.declaration.name === componentName) continue;
            if (
              statement.declaration.type === "FunctionDeclaration" &&
              statement.declaration.id?.name === componentName
            ) {
              continue;
            }
          } else {
            continue;
          }

          context.report({
            node: statement,
            message: `Component files must export only their own component "${componentName}". Import other values directly from their files.`,
          });
        }
      },
    };
  },
};
