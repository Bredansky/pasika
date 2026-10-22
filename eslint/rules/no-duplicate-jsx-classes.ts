/**
 * ESLint rule: pasika/no-duplicate-jsx-classes
 *
 * Identical static class sets on native JSX elements in different files
 * are extracted into a shared component when the set has five or more classes.
 *
 * @see docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getJsxClassReuses } from "../project/jsx-class-reuse";
import { sourceRootOf } from "./project-root";

export const noDuplicateJsxClassesRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Extract identical static JSX class sets into reusable components." },
  },
  create(context) {
    const file = path.resolve(context.filename);
    if (!/\.(?:jsx|tsx)$/.test(file) || /\.(?:test|spec)\.(?:jsx|tsx)$/.test(file)) return {};
    const root = sourceRootOf(context);
    const matches = getJsxClassReuses(root).get(file) ?? [];
    if (matches.length === 0) return {};

    return {
      Program(node) {
        for (const { occurrence, original, commonClasses } of matches) {
          const reference = path.relative(path.dirname(root), original.file).split(path.sep).join("/");
          context.report({
            node,
            loc: { line: occurrence.line, column: occurrence.column },
            message:
              `<${occurrence.tag}> repeats the same set of ${String(commonClasses.length)} classes as ` +
              `${reference}:${String(original.line)}. Extract a shared component. ` +
              "See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md",
          });
        }
      },
    };
  },
};
