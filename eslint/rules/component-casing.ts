/**
 * ESLint rule: pasika/component-casing
 *
 * A component's name MUST be PascalCase, since React only resolves a
 * capitalized JSX tag as a custom component.
 *
 * @see docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { findJsxReturningDeclarations } from "./component-conventions";
import { sourceRootOf } from "./project-root";

function isPascalCase(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

export const componentCasingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a JSX-returning function or const to be named in PascalCase.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};
    if (path.extname(filename) !== ".tsx") return {};

    return {
      Program(node) {
        for (const declaration of findJsxReturningDeclarations(context.sourceCode.text, filename)) {
          if (isPascalCase(declaration.name)) continue;
          context.report({
            node,
            loc: { line: declaration.line, column: declaration.column },
            message: `${declaration.name} must be PascalCase; only a PascalCase name resolves as a JSX component. See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md`,
          });
        }
      },
    };
  },
};
