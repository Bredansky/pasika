/**
 * ESLint rule: pasika/pure-function-extract
 *
 * A pure function MUST be extracted to utils/, even when it has one consumer.
 *
 * @see docs/code-organization-guide/rules/utilities-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions -- ESLint rule files work with ESTree AST nodes inherently */

import path from "node:path";
import type { Rule } from "eslint";

function isComponentLikeName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

function hasHookUsage(body: any): boolean {
  if (!body || typeof body !== "object") return false;
  const block = body as { type?: string; body?: any[] };
  if (block.type !== "BlockStatement" || !Array.isArray(block.body)) return false;

  for (const stmt of block.body) {
    const expr = stmt?.expression;
    if (
      expr?.type === "CallExpression" &&
      expr.callee?.type === "Identifier" &&
      typeof expr.callee.name === "string" &&
      isHookName(expr.callee.name)
    ) {
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
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};

    const sourceRoot = path.resolve("src");
    const relative = path.relative(sourceRoot, filename);
    if (relative.startsWith("..")) return {};

    const segments = relative.split(path.sep);

    // Already in utils/ or a support folder — fine
    if (segments[0] === "utils") return {};
    if (segments[0] === "app") return {};
    const supportFolders = new Set(["hooks", "types", "schemas", "constants", "utils"]);
    if (segments.length >= 2 && supportFolders.has(segments[segments.length - 1] ?? "")) return {};

    function report(node: any, name: string): void {
      context.report({
        node,
        message: `Extract pure function "${name}" to utils/. See docs/code-organization-guide/rules/utilities-rule.md`,
      });
    }

    return {
      FunctionDeclaration(node: any) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        if (!exported) return;
        const name = node.id?.name;
        if (!name) return;
        if (isComponentLikeName(name) || isHookName(name)) return;
        if (node.body === undefined) return;
        if (hasHookUsage(node.body)) return;
        report(node, name);
      },

      VariableDeclarator(node: any) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (!name) return;

        const parent = node.parent?.parent;
        const exported = parent?.type === "ExportNamedDeclaration";
        if (!exported) return;
        if (isComponentLikeName(name) || isHookName(name)) return;

        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") {
          return;
        }

        if (hasHookUsage(init)) return;
        report(node, name);
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions -- re-enable after AST node access block */
