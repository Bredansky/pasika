/**
 * ESLint rule: pasika/data-component-case
 *
 * Enforces the stable component marker contract from the smart-vs-dumb
 * component rule. Smart components always expose one data-component marker;
 * dumb components may omit it, but when present it uses kebab-case. A
 * rendered path may contain only one marker owned by the component.
 *
 * @see docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { findRenderedComponentMarkerPaths, parseComponentInfo } from "./component-conventions";

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

export const dataComponentCaseRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce stable data-component markers for React component surfaces.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!filename.endsWith(".tsx")) return {};
    const base = path.basename(filename, path.extname(filename));
    if (NEXT_ROUTING_FILES.has(base)) return {};

    const components = parseComponentInfo(context.sourceCode.text, filename);

    return {
      Program(node) {
        for (const component of components) {
          const expected = component.smart ? component.name : toKebabCase(component.name);
          const renderedPaths = findRenderedComponentMarkerPaths(component);
          const hasNoMarker = renderedPaths.every((values) => values.length === 0);
          const hasStableMarker =
            renderedPaths.length > 0 && renderedPaths.every((values) => values.length === 1 && values[0] === expected);

          if (component.smart) {
            if (hasStableMarker) continue;

            const hasSingleWrongMarker =
              renderedPaths.length > 0 &&
              renderedPaths.every((values) => values.length === 1 && values[0] !== expected) &&
              new Set(renderedPaths.map((values) => values[0])).size === 1;

            context.report({
              node,
              message: hasSingleWrongMarker
                ? `data-component for smart component "${component.name}" must match the component name: expected "${expected}".`
                : `Smart component "${component.name}" must expose exactly one stable data-component="${expected}" marker in every rendered result. Place it on the existing meaningful DOM surface or forward it to the child component that renders that surface. See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md`,
            });
            continue;
          }

          if (hasNoMarker || hasStableMarker) continue;

          const hasSingleWrongMarker =
            renderedPaths.length > 0 &&
            renderedPaths.every((values) => values.length === 1 && values[0] !== expected) &&
            new Set(renderedPaths.map((values) => values[0])).size === 1;

          context.report({
            node,
            message: hasSingleWrongMarker
              ? `data-component for dumb component "${component.name}" must be kebab-case: expected "${expected}".`
              : `Dumb component "${component.name}" may omit data-component, but when present it must expose exactly one stable data-component="${expected}" marker on its meaningful surface.`,
          });
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
