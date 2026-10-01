/**
 * ESLint rule: pasika/enum-placement
 *
 * A TypeScript enum MUST always live in a constants/ folder because it creates
 * runtime values as well as a type.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { sourceRootOf } from "./project-root";

export const enumPlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require TypeScript enum declarations to live in constants/ folders.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};
    if (path.basename(path.dirname(filename)) === "constants") return {};

    return {
      TSEnumDeclaration(node: Rule.Node) {
        context.report({
          node,
          message:
            "A TypeScript enum must live in a constants/ folder because it creates runtime values as well as a type. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
