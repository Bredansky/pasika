/**
 * ESLint rule: pasika/hook-complexity
 *
 * - A custom hook with exactly one consumer MUST be extracted when its
 *   extraction score reaches two.
 * - A custom hook with one consumer whose extraction score is below two MUST
 *   stay inline in its consumer file.
 *
 * Five imperative categories, each worth at most one point regardless of how
 * many times it occurs: calling two or more distinct built-in hooks, and each
 * of four kinds of imperative work a hook body's other calls can perform —
 * subscriptions, external I/O and persistence, DOM manipulation, or resource
 * lifecycle. Common pairs like useState + useEffect are ordinary hook usage,
 * not evidence of a hook doing too much, so hook diversity alone can score at
 * most 1 — reaching the threshold of 2 always requires at least one real
 * side-effect category too.
 *
 * @see docs/next-codebase-guide/rules/hook-extraction-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";
import { sourceRootOf } from "./project-root";

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

// The four kinds of imperative work a hook body's non-hook calls can perform.
// Each is its own category, worth one point no matter how many times it occurs.
const SUBSCRIPTION_METHODS = new Set(["on", "off", "addEventListener", "removeEventListener"]);
const STORAGE_OBJECTS = new Set(["localStorage", "sessionStorage", "indexedDB"]);
const DOM_METHODS = new Set(["focus", "blur", "scrollIntoView", "click"]);
const DOM_PROPERTIES = new Set(["classList"]);
const DOM_CONSTRUCTORS = new Set(["MutationObserver", "ResizeObserver", "IntersectionObserver"]);
const LIFECYCLE_METHODS = new Set(["load", "destroy", "dispose", "close", "cleanup", "unmount"]);

function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/** The property name of a call like `player.load(...)`, or undefined for any other call shape. */
function calledMethodName(node: ts.CallExpression): string | undefined {
  return ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : undefined;
}

/** The object name of a call like `localStorage.getItem(...)`, or undefined for any other call shape. */
function calledOnObjectName(node: ts.CallExpression): string | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) return undefined;
  const object = node.expression.expression;
  return ts.isIdentifier(object) ? object.text : undefined;
}

/** Whether one node is a call to a built-in hook, and if so, which one. */
function calledHookName(node: ts.Node): string | undefined {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && REACT_HOOKS.has(node.expression.text)
    ? node.expression.text
    : undefined;
}

/**
 * Whether one node performs one of the four kinds of imperative work a hook
 * body's non-hook calls can do: subscriptions, external I/O and persistence,
 * DOM manipulation, or resource lifecycle.
 */
function sideEffectCategoryOf(
  node: ts.Node,
): "subscription" | "externalIO" | "domManipulation" | "lifecycle" | undefined {
  if (ts.isAwaitExpression(node)) return "externalIO";

  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && DOM_CONSTRUCTORS.has(node.expression.text)) {
    return "domManipulation";
  }

  if (ts.isPropertyAccessExpression(node) && DOM_PROPERTIES.has(node.name.text)) {
    return "domManipulation";
  }

  if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression) && node.expression.text === "fetch") return "externalIO";

    const method = calledMethodName(node);
    if (method && SUBSCRIPTION_METHODS.has(method)) return "subscription";
    if (method && LIFECYCLE_METHODS.has(method)) return "lifecycle";
    if (method && DOM_METHODS.has(method)) return "domManipulation";

    const object = calledOnObjectName(node);
    if (object && STORAGE_OBJECTS.has(object)) return "externalIO";
  }

  return undefined;
}

/**
 * Scores a hook body for extraction: one point for calling two or more
 * distinct built-in hooks, plus one point for each of the four kinds of
 * imperative work found anywhere in the body — subscriptions, external I/O
 * and persistence, DOM manipulation, resource lifecycle — capped at one
 * point per kind no matter how many times it occurs. Re-parses just the
 * body's source slice with the TypeScript compiler so the walk stays fully
 * typed instead of unrolling ESTree unions by hand.
 */
function computeExtractionScore(body: ESTree.BlockStatement, sourceText: string): number {
  const start = body.range?.[0] ?? 0;
  const end = body.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "hook.ts",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const hookNames = new Set<string>();
  const sideEffectCategories = new Set<string>();
  const visit = (node: ts.Node): void => {
    const hookName = calledHookName(node);
    if (hookName) hookNames.add(hookName);

    const sideEffect = sideEffectCategoryOf(node);
    if (sideEffect) sideEffectCategories.add(sideEffect);

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const hookDiversityPoint = hookNames.size >= 2 ? 1 : 0;
  return hookDiversityPoint + sideEffectCategories.size;
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
    const sourceRoot = sourceRootOf(context);
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

      const score = computeExtractionScore(body, sourceText);
      const parentFolder = segments.length >= 2 ? segments[segments.length - 2] : undefined;
      const inSupportFolder = parentFolder === "hooks";

      if (score >= 2 && !inSupportFolder) {
        context.report({
          node,
          message:
            `Hook "${name}" has an extraction score of ${String(score)} and must be extracted to a hooks/ folder. ` +
            "See docs/next-codebase-guide/rules/hook-extraction-rule.md",
        });
      } else if (score < 2 && inSupportFolder) {
        context.report({
          node,
          message:
            `Hook "${name}" has an extraction score below two and must stay inline in its consumer file. ` +
            "See docs/next-codebase-guide/rules/hook-extraction-rule.md",
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
