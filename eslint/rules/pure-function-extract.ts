/**
 * ESLint rule: pasika/pure-function-extract
 *
 * A pure function MUST be extracted to utils/, even when it has one consumer.
 *
 * A route.ts module handler's own internal caller counts as that "one
 * consumer": Next.js route handlers are a dead end for the project-wide import
 * graph the other placement rules read, so a pure helper declared beside a
 * handler never gets a second, cross-file consumer to trigger extraction any
 * other way. This rule therefore checks route.ts module-scope declarations
 * whether or not they are exported, while every other file keeps requiring
 * export first, since an unexported helper elsewhere is invisible outside its
 * file and extracting it would add indirection no consumer needs yet.
 *
 * @see docs/next-codebase-guide/rules/utilities-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { FunctionDeclarationNode } from "../ast-types";
import { sourceRootOf } from "./project-root";

// Next.js requires these exact names exported from route.ts; none of them may
// move to utils/ without breaking the route.
const ROUTE_HANDLER_EXPORT_NAMES = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "generateStaticParams",
]);

function isComponentLikeName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

function hasHookUsage(body: ESTree.BlockStatement): boolean {
  for (const stmt of body.body) {
    if (stmt.type !== "ExpressionStatement") continue;
    const expr = stmt.expression;
    if (expr.type === "CallExpression" && expr.callee.type === "Identifier" && isHookName(expr.callee.name)) {
      return true;
    }
  }
  return false;
}

export const pureFunctionExtractRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require pure functions declared in component files to be extracted to utils/.",
    },
  },
  create(context) {
    const filename = context.filename;
    const isRouteFile = path.basename(filename) === "route.ts";
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx") && !isRouteFile) return {};

    const sourceRoot = sourceRootOf(context);
    const relative = path.relative(sourceRoot, filename);
    if (relative.startsWith("..")) return {};

    const segments = relative.split(path.sep);

    // Already in utils/ or a support folder — fine
    if (segments[0] === "utils") return {};
    // Every app/ file is exempt except route.ts, whose module-scope
    // declarations are otherwise invisible to the rest of the rule set.
    if (segments[0] === "app" && !isRouteFile) return {};
    const supportFolders = new Set(["hooks", "types", "schemas", "constants", "utils"]);
    if (segments.length >= 2 && supportFolders.has(segments[segments.length - 1] ?? "")) return {};

    function report(node: Rule.Node, name: string): void {
      context.report({
        node,
        message: `Extract pure function "${name}" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md`,
      });
    }

    return {
      FunctionDeclaration(node: FunctionDeclarationNode) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        const moduleLevel = exported || node.parent?.type === "Program";
        if (!moduleLevel) return;
        if (!isRouteFile && !exported) return;

        const name = node.id?.name;
        if (!name) return;
        if (isRouteFile && ROUTE_HANDLER_EXPORT_NAMES.has(name)) return;
        if (isComponentLikeName(name) || isHookName(name)) return;
        if (!node.body || hasHookUsage(node.body)) return;
        report(node, name);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (!name) return;

        const container = node.parent.parent;
        const exported = container?.type === "ExportNamedDeclaration";
        const moduleLevel = exported || container?.type === "Program";
        if (!moduleLevel) return;
        if (!isRouteFile && !exported) return;

        if (isRouteFile && ROUTE_HANDLER_EXPORT_NAMES.has(name)) return;
        if (isComponentLikeName(name) || isHookName(name)) return;

        const init = node.init;
        if (!init || (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression")) {
          return;
        }
        if (init.body.type === "BlockStatement" && hasHookUsage(init.body)) return;
        report(node, name);
      },
    };
  },
};
