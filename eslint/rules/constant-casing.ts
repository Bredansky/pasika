/**
 * ESLint rule: pasika/constant-casing
 *
 * A constant's name MUST be camelCase, unless its value directly reads a
 * process.env variable (with or without a fallback), in which case
 * SCREAMING_SNAKE_CASE is allowed, or a framework requires a specific name
 * (Next.js route handlers exported as GET, POST, PUT, PATCH, DELETE, HEAD, or
 * OPTIONS).
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { sourceRootOf } from "./project-root";

/** Next.js App Router route handlers must be exported under these exact names. */
const NEXTJS_ROUTE_HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function isScreamingSnakeCase(name: string): boolean {
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(name);
}

function isProcessEnvMember(node: ESTree.Expression | ESTree.PrivateIdentifier): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object.type === "MemberExpression" &&
    node.object.object.type === "Identifier" &&
    node.object.object.name === "process" &&
    node.object.property.type === "Identifier" &&
    node.object.property.name === "env"
  );
}

/** True when `node` is a direct `process.env.X` read, optionally wrapped in a `??` or `? :` fallback. */
function readsProcessEnv(node: ESTree.Expression | null | undefined): boolean {
  if (!node) return false;
  if (isProcessEnvMember(node)) return true;
  if (node.type === "LogicalExpression") return readsProcessEnv(node.left) || readsProcessEnv(node.right);
  if (node.type === "ConditionalExpression") {
    return readsProcessEnv(node.test) || readsProcessEnv(node.consequent) || readsProcessEnv(node.alternate);
  }
  return false;
}

export const constantCasingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a module-level constant to be camelCase, unless it directly reads a process.env variable.",
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
        if (readsProcessEnv(node.init)) return;

        context.report({
          node,
          message: `${name} must be camelCase; only a direct process.env read may use SCREAMING_SNAKE_CASE. See docs/next-codebase-guide/rules/constants-rule.md`,
        });
      },
    };
  },
};
