/**
 * ESLint rule: pasika/hook-complexity
 *
 * - A custom hook with exactly one consumer MUST be extracted when its
 *   extraction score reaches two.
 * - A custom hook with one consumer whose extraction score is below two MUST
 *   stay inline in its consumer file.
 *
 * An imperative category is either a distinct built-in hook called by name,
 * or one of four kinds of imperative work a hook body's other calls can
 * perform: subscriptions, external I/O and persistence, DOM manipulation, or
 * resource lifecycle. A single category is just a hook doing its job, not a
 * signal — common pairs like useState + useEffect are ordinary, not evidence
 * of a hook doing too much — so the first category found is free and every
 * one after it adds one to the score: two categories score 1, three score 2
 * and cross the threshold.
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

// The four kinds of imperative work a hook body's non-hook calls can perform,
// alongside calling a built-in hook by name. Each is a distinct category the
// same way each built-in hook name is.
const SUBSCRIPTION_METHODS = new Set(["on", "off", "addEventListener", "removeEventListener"]);
const STORAGE_OBJECTS = new Set(["localStorage", "sessionStorage", "indexedDB"]);
const DOM_METHODS = new Set(["focus", "blur", "scrollIntoView", "click"]);
const DOM_PROPERTIES = new Set(["classList"]);
const DOM_CONSTRUCTORS = new Set(["MutationObserver", "ResizeObserver", "IntersectionObserver"]);
const LIFECYCLE_METHODS = new Set(["load", "destroy", "dispose", "close", "cleanup", "unmount"]);

const SUBSCRIPTIONS = "Subscriptions";
const EXTERNAL_IO = "External I/O and persistence";
const DOM_MANIPULATION = "DOM manipulation";
const RESOURCE_LIFECYCLE = "Resource lifecycle";

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

/**
 * Classifies one node as an imperative category, if it is one: a call to a
 * built-in hook by name, or one of the four kinds of imperative work —
 * subscriptions, external I/O and persistence, DOM manipulation, or resource
 * lifecycle — a hook body's other calls can perform.
 */
function categoryOf(node: ts.Node): string | undefined {
  if (ts.isAwaitExpression(node)) return EXTERNAL_IO;

  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && DOM_CONSTRUCTORS.has(node.expression.text)) {
    return DOM_MANIPULATION;
  }

  if (ts.isPropertyAccessExpression(node) && DOM_PROPERTIES.has(node.name.text)) {
    return DOM_MANIPULATION;
  }

  if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression) && REACT_HOOKS.has(node.expression.text)) return node.expression.text;
    if (ts.isIdentifier(node.expression) && node.expression.text === "fetch") return EXTERNAL_IO;

    const method = calledMethodName(node);
    if (method && SUBSCRIPTION_METHODS.has(method)) return SUBSCRIPTIONS;
    if (method && LIFECYCLE_METHODS.has(method)) return RESOURCE_LIFECYCLE;
    if (method && DOM_METHODS.has(method)) return DOM_MANIPULATION;

    const object = calledOnObjectName(node);
    if (object && STORAGE_OBJECTS.has(object)) return EXTERNAL_IO;
  }

  return undefined;
}

/**
 * Scores a hook body for extraction: the distinct imperative categories found
 * anywhere inside it, minus one — the first one found is free, since a
 * single call is just that call doing its job, not a complexity signal.
 * Every distinct category after it adds one to the score. Re-parses just the
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
  const categories = new Set<string>();
  const visit = (node: ts.Node): void => {
    const category = categoryOf(node);
    if (category) categories.add(category);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Math.max(0, categories.size - 1);
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
