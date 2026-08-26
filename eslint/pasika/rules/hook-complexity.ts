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

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types.js";

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

/**
 * Counts the distinct React hook categories called anywhere inside a hook body.
 * Re-parses just the body's source slice with the TypeScript compiler so the
 * walk stays fully typed instead of unrolling ESTree unions by hand.
 */
function countImperativeCategories(body: ESTree.BlockStatement, sourceText: string): number {
  const start = body.range?.[0] ?? 0;
  const end = body.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "hook.ts",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const categories = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && REACT_HOOKS.has(node.expression.text)) {
      categories.add(node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
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
    const sourceText = context.sourceCode.text;

    function checkHook(
      node: Rule.Node,
      name: string | undefined,
      body: ESTree.BlockStatement | undefined,
      exported: boolean,
    ): void {
      if (!exported) return;
      if (!name || !isHookName(name)) return;
      if (!body) return;

      const imperativeCount = countImperativeCategories(body, sourceText);
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
      FunctionDeclaration(node: FunctionDeclarationNode) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        checkHook(node, node.id?.name, node.body, exported);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const exported = node.parent.parent?.type === "ExportNamedDeclaration";
        if (!exported) return;

        const init = node.init;
        if (!init || (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression")) {
          return;
        }
        if (init.body.type !== "BlockStatement") return;

        checkHook(node, node.id.name, init.body, true);
      },
    };
  },
};
