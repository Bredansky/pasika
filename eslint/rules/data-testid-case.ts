/**
 * ESLint rule: pasika/data-testid-case
 *
 * Enforces that a smart component renders exactly one outer DOM element and
 * sets data-testid on it. When the rendered result has one statically
 * identifiable intrinsic root, the data-testid value and casing are checked.
 * A smart component with no single statically identifiable root (multiple
 * roots, branches returning different tags, a fragment) must wrap its content
 * in one outer element instead, so tests always have a stable element to
 * anchor data-testid to.
 *
 * @see docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { findSimpleRoot, getTestId, parseComponentInfo } from "./component-conventions";

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
    const base = path.basename(filename, path.extname(filename));
    if (NEXT_ROUTING_FILES.has(base)) return {};
    const text = context.sourceCode.text;
    const components = parseComponentInfo(text, filename);

    return {
      Program(node) {
        for (const component of components) {
          const root = findSimpleRoot(component, text, filename);
          if (root) {
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
          } else if (component.smart) {
            context.report({
              node,
              message:
                `Smart component "${component.name}" has no single outer element; wrap its content in one outer ` +
                `element with data-testid="${component.name}" instead of rendering multiple roots. ` +
                "See docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md",
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
