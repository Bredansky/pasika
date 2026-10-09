/**
 * ESLint rule: pasika/no-mixed-concerns
 *
 * Enforces one React component per .tsx file. Supporting runtime exports
 * remain colocated with that component when consumers also import the owner.
 *
 * @see docs/next-codebase-guide/rules/no-mixed-concerns-rule.md
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, resolveSpecifier, symbolKey } from "../project/index";
import { parseComponentInfo } from "./component-conventions";
import { sourceRootOf } from "./project-root";

export const noMixedConcernsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce one React component per .tsx file and colocated exports consumed alongside it.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx")) return {};

    return {
      "Program:exit"() {
        const components = parseComponentInfo(context.sourceCode.text, context.filename, { includeNonExported: true });
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
        const file = path.resolve(context.filename);
        const sourceRoot = sourceRootOf(context);
        const index = getProjectIndex(sourceRoot);
        const componentConsumers = index?.symbolConsumers.get(symbolKey(file, componentName)) ?? new Set<string>();
        const isNextPageOrLayout = /(?:^|[/\\])src[/\\]app[/\\](?:[^/\\]+[/\\])*(?:page|layout)\.tsx$/.test(
          context.filename,
        );

        const checkSupportingExport = (name: string, loc: { line: number; column: number }): void => {
          if (name === componentName) return;
          if (isNextPageOrLayout) {
            if (["metadata", "viewport", "generateMetadata", "generateViewport"].includes(name)) return;
            context.report({
              loc,
              message: `Next.js page/layout files cannot export "${name}". Use a separate module for supporting values.`,
            });
            return;
          }

          // No external consumers means there is no independent import to check.
          // Other rules handle unused types and schemas.
          const consumers = index?.symbolConsumers.get(symbolKey(file, name));
          if (!consumers) return;

          const independent = [...consumers].filter((consumer) => !componentConsumers.has(consumer));
          if (independent.length > 0) {
            context.report({
              loc,
              message:
                `Supporting export "${name}" is imported without its component "${componentName}". ` +
                "Import them together or extract the supporting value to its appropriate module. " +
                "See docs/next-codebase-guide/rules/no-mixed-concerns-rule.md",
            });
          }
        };

        for (const statement of context.sourceCode.ast.body) {
          if (statement.type === "ExportNamedDeclaration") {
            if (/^export\s+(?:type|interface)\b/.test(context.sourceCode.getText(statement))) continue;
            const declaration = statement.declaration;
            if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") {
              checkSupportingExport(declaration.id.name, statement.loc?.start ?? { line: 1, column: 0 });
              continue;
            }
            if (declaration?.type === "VariableDeclaration") {
              for (const variable of declaration.declarations) {
                if (variable.id.type === "Identifier") {
                  checkSupportingExport(variable.id.name, statement.loc?.start ?? { line: 1, column: 0 });
                }
              }
              continue;
            }
            const target =
              typeof statement.source?.value === "string"
                ? resolveSpecifier(file, statement.source.value, sourceRoot)
                : undefined;
            const forwardedComponents = target?.endsWith(".tsx")
              ? parseComponentInfo(readFileSync(target, "utf8"), target).map((component) => component.name)
              : [];

            for (const specifier of statement.specifiers) {
              if (/^type\b/.test(context.sourceCode.getText(specifier))) continue;
              if (specifier.local.type !== "Identifier") continue;
              if (target && forwardedComponents.includes(specifier.local.name)) {
                context.report({
                  node: statement,
                  message: `Component file "${componentName}" must not re-export another component "${specifier.local.name}". Import that component directly.`,
                });
              } else if (!statement.source) {
                checkSupportingExport(specifier.local.name, statement.loc?.start ?? { line: 1, column: 0 });
              } else if (specifier.exported.type === "Identifier") {
                checkSupportingExport(specifier.exported.name, statement.loc?.start ?? { line: 1, column: 0 });
              }
            }
          } else if (statement.type === "ExportAllDeclaration") {
            if (/^export\s+type\b/.test(context.sourceCode.getText(statement))) continue;
            // Wildcards cannot guarantee that another component is not forwarded.
            context.report({
              node: statement,
              message: `Component file "${componentName}" must not use a wildcard runtime re-export. Export named supporting values only.`,
            });
          } else if (statement.type === "ExportDefaultDeclaration") {
            const declaration = statement.declaration;
            if (declaration.type === "Identifier" && declaration.name === componentName) continue;
            if (declaration.type === "FunctionDeclaration" && declaration.id?.name === componentName) continue;
            checkSupportingExport("default", statement.loc?.start ?? { line: 1, column: 0 });
          }
        }
      },
    };
  },
};
