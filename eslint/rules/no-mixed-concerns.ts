/**
 * ESLint rule: pasika/no-mixed-concerns
 *
 * Enforces the "No Mixed Concerns Rule" — one React component per .tsx file.
 * A component is an uppercase-named function or constant that renders JSX,
 * whether it is exported or kept private, so a file that defines a second
 * component of either kind must move it to its own file.
 *
 * @see docs/code-organization-guide/rules/no-mixed-concerns-rule.md
 */

import type { Rule } from "eslint";
import { parseComponentInfo } from "./component-conventions";

export const noMixedConcernsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce one React component per .tsx file, counting private components.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx")) return {};

    const sourceCode = context.sourceCode.text;

    return {
      "Program:exit"() {
        const components = parseComponentInfo(sourceCode, context.filename, { includeNonExported: true });
        if (components.length <= 1) return;

        for (const extra of components.slice(1)) {
          context.report({
            loc: { line: 1, column: 0 },
            message:
              `File defines multiple components. "${extra.name}" is an extra component. ` +
              "Move it to its own file. Each component file MUST define exactly one component. " +
              "See docs/code-organization-guide/rules/no-mixed-concerns-rule.md",
          });
        }
      },
    };
  },
};
