/**
 * ESLint rule: pasika/constant-casing
 *
 * A constant's name MUST be camelCase, unless a framework requires a
 * specific name (Next.js route handlers exported as GET, POST, PUT, PATCH,
 * DELETE, HEAD, or OPTIONS).
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { sourceRootOf } from "./project-root";

/** Next.js App Router route handlers must be exported under these exact names. */
const NEXTJS_ROUTE_HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function isScreamingSnakeCase(name: string): boolean {
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(name);
}

export const constantCasingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a module-level constant to be camelCase, unless a framework requires a specific name.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const declaration = node.parent;
        if (declaration.type !== "VariableDeclaration" || declaration.kind !== "const") return;

        const container = declaration.parent;
        const isModuleLevel =
          container.type === "Program" ||
          (container.type === "ExportNamedDeclaration" && container.parent.type === "Program");
        if (!isModuleLevel) return;

        const { name } = node.id;
        if (!isScreamingSnakeCase(name)) return;
        if (NEXTJS_ROUTE_HANDLER_NAMES.has(name)) return;

        context.report({
          node,
          message: `${name} must be camelCase, unless a framework requires this exact name. See docs/next-codebase-guide/rules/constants-rule.md`,
        });
      },
    };
  },
};
