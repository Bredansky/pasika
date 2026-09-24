/**
 * ESLint rule: pasika/data-testid-case
 *
 * Enforces that every rendered path of a smart component exposes exactly one
 * stable data-testid matching the component name. The anchor may live on an
 * intrinsic element or on a child component that forwards data-testid to the
 * meaningful DOM surface, so portal/composition components do not need an
 * artificial wrapper only to satisfy the rule.
 *
 * @see docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { findRenderedTestIdPaths, findSimpleRoot, getTestId, parseComponentInfo } from "./component-conventions";

const NEXT_ROUTING_FILES = new Set([
  "default",
  "error",
  "global-error",
  "instrumentation",
  "layout",
  "loading",
  "middleware",
  "not-found",
  "page",
  "route",
  "template",
  // File conventions Next.js requires to keep their exact names in src/app/
  "apple-icon",
  "icon",
  "manifest",
  "opengraph-image",
  "robots",
  "sitemap",
  "twitter-image",
]);

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
    const base = path.basename(filename, path.extname(filename));
    if (NEXT_ROUTING_FILES.has(base)) return {};
    const text = context.sourceCode.text;
    const components = parseComponentInfo(text, filename);

    return {
      Program(node) {
        for (const component of components) {
          if (component.smart) {
            const expected = component.name;
            const renderedPaths = findRenderedTestIdPaths(component);
            const hasStableAnchor =
              renderedPaths.length > 0 &&
              renderedPaths.every((values) => values.filter((value) => value === expected).length === 1);

            if (hasStableAnchor) continue;

            const hasSingleWrongCasedAnchor =
              renderedPaths.length > 0 &&
              renderedPaths.every((values) => values.length === 1 && values[0] !== expected) &&
              new Set(renderedPaths.map((values) => values[0])).size === 1;

            if (hasSingleWrongCasedAnchor) {
              context.report({
                node,
                message: `data-testid for smart component "${component.name}" must be PascalCase: expected "${expected}".`,
              });
              continue;
            }

            context.report({
              node,
              message:
                `Smart component "${component.name}" must expose exactly one stable data-testid="${expected}" anchor in every rendered result. ` +
                "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
                "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
            });
            continue;
          }

          const root = findSimpleRoot(component, text, filename);
          if (!root) continue;

          const { value } = getTestId(root);
          const expected = toKebabCase(component.name);
          if (value === undefined || value === expected) continue;
          if (!isKebabCase(value)) {
            context.report({
              node,
              message: `data-testid for dumb component "${component.name}" must be kebab-case: expected "${expected}".`,
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
