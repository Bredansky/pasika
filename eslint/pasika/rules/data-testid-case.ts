/**
 * ESLint rule: pasika/data-testid-case
 *
 * Enforces data-testid casing for components whose rendered result has one
 * statically identifiable intrinsic root. Components with multiple or dynamic
 * roots are intentionally left alone, matching the documented exemption.
 *
 * @see docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { findSimpleRoot, getTestId, parseComponentInfo } from "./component-conventions.js";

const isPascalCase = (value: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(value);
const isKebabCase = (value: string): boolean => /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);

export const dataTestIdCaseRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce data-testid casing for smart and dumb components with a single intrinsic root.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!filename.endsWith(".tsx")) return {};
    const text = context.sourceCode.text;
    const components = parseComponentInfo(text, filename);

    return {
      Program(node) {
        for (const component of components) {
          const root = findSimpleRoot(component, text, filename);
          if (!root) continue;
          const { value } = getTestId(root);
          const expected = component.smart ? component.name : toKebabCase(component.name);
          if (component.smart && value === undefined) {
            context.report({
              node,
              message: `Smart component "${component.name}" with one outer DOM element must set data-testid="${expected}".`,
            });
            continue;
          }
          if (value === undefined || value === expected) continue;
          if (component.smart ? !isPascalCase(value) || value !== expected : !isKebabCase(value)) {
            context.report({
              node,
              message: `data-testid for ${component.smart ? "smart" : "dumb"} component "${component.name}" must be ${component.smart ? "PascalCase" : "kebab-case"}: expected "${expected}".`,
            });
          }
        }
      },
    };
  },
};

function toKebabCase(value: string): string {
  return value
    .replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/g, "$<lower>-$<upper>")
    .replace(/(?<first>[A-Z])(?<rest>[A-Z][a-z])/g, "$<first>-$<rest>")
    .toLowerCase();
}
