/**
 * ESLint rule: pasika/hook-complexity
 *
 * - A custom hook with exactly one consumer MUST be extracted when it contains
 *   two or more imperative categories.
 * - A custom hook with one consumer that contains fewer than two imperative
 *   categories MUST stay inline in its consumer file.
 *
 * @see docs/code-organization-guide/rules/hook-extraction-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/restrict-template-expressions -- ESLint rule files work with ESTree AST nodes inherently */

import path from "node:path";
import type { Rule } from "eslint";

const REACT_HOOKS = new Set([
  "useState",
  "useEffect",
  "useContext",
  "useReducer",
  "useCallback",
  "useMemo",
  "useRef",
  "useLayoutEffect",
  "useImperativeHandle",
  "useDebugValue",
  "useDeferredValue",
  "useTransition",
  "useId",
  "useSyncExternalStore",
  "useInsertionEffect",
]);

function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

function countImperativeCategories(body: any): number {
  const categories = new Set<string>();
  if (!body || typeof body !== "object") return 0;

  const block = body as { type?: string; body?: any[] };
  if (block.type !== "BlockStatement" || !Array.isArray(block.body)) return 0;

  function walk(node: any): void {
    if (!node || typeof node !== "object") return;

    if (node.type === "CallExpression" && node.callee) {
      const callee = node.callee as { type?: string; name?: string };
      if (callee.type === "Identifier" && callee.name && REACT_HOOKS.has(callee.name)) {
        categories.add(callee.name);
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "type" || key === "loc" || key === "range" || key === "parent") continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && "type" in item) walk(item);
        }
      } else if (val && typeof val === "object" && "type" in val) {
        walk(val);
      }
    }
  }

  walk(block);
  return categories.size;
}

export const hookComplexityRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require extraction of complex single-consumer hooks and inline of simple ones.",
    },
  },
  create(context) {
    const filename = context.filename;
    const sourceRoot = path.resolve("src");
    const relative = path.relative(sourceRoot, filename);
    if (relative.startsWith("..")) return {};

    const segments = relative.split(path.sep);

    function checkHook(node: any, exported: boolean): void {
      if (!exported) return;
      const name = node.id?.name;
      if (!name || !isHookName(name)) return;
      if (node.body === undefined) return;

      const imperativeCount = countImperativeCategories(node.body);
      const parentFolder = segments.length >= 2 ? segments[segments.length - 2] : undefined;
      const inSupportFolder = parentFolder === "hooks";

      if (imperativeCount >= 2 && !inSupportFolder) {
        context.report({
          node,
          message:
            `Hook "${name}" has ${String(imperativeCount)} imperative categories and must be extracted to a hooks/ folder. ` +
            "See docs/code-organization-guide/rules/hook-extraction-rule.md",
        });
      } else if (imperativeCount < 2 && inSupportFolder) {
        context.report({
          node,
          message:
            `Hook "${name}" has fewer than two imperative categories and must stay inline in its consumer file. ` +
            "See docs/code-organization-guide/rules/hook-extraction-rule.md",
        });
      }
    }

    return {
      FunctionDeclaration(node: any) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        checkHook(node, exported);
      },

      VariableDeclarator(node: any) {
        if (node.id.type !== "Identifier") return;
        const parent = node.parent?.parent;
        const exported = parent?.type === "ExportNamedDeclaration";
        if (!exported) return;

        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") {
          return;
        }

        checkHook({ ...init, id: { name: node.id.name } }, true);
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/restrict-template-expressions -- re-enable after AST node access block */
