/**
 * ESLint rule: pasika/route-handler-shape
 *
 * An HTTP method handler exported from route.ts MUST be wrapped in
 * withResponse — the one boundary that catches an HttpError thrown by
 * requireUserId/requireUserAccount or any call the handler makes, and that
 * builds and validates the response from the handler's returned
 * {message, data}. A handler under it MUST NOT contain a try statement, a
 * loop, or an if statement of its own, and every function it calls MUST be
 * imported rather than declared in route.ts — otherwise the same logic this
 * rule bans from the handler's own body can reappear one function away, in
 * the same file.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const REQUIRED_BOUNDARY = "withResponse";

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression;

function isFunctionLike(node: ESTree.Node): node is FunctionLike {
  return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

/** Finds the function that actually runs, which may sit behind one or more wrapping calls. */
function findHandler(node: ESTree.Expression): FunctionLike | undefined {
  if (isFunctionLike(node)) return node;
  if (node.type === "CallExpression") {
    for (const arg of node.arguments) {
      if (arg.type === "SpreadElement") continue;
      const found = findHandler(arg);
      if (found) return found;
    }
  }
  return undefined;
}

function isLoop(node: ts.Node): boolean {
  return (
    ts.isForStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node)
  );
}

function isFunctionBoundary(node: ts.Node): boolean {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isFunctionDeclaration(node);
}

type ControlFlowKind = "try" | "loop" | "if";

interface HandlerAnalysis {
  kinds: Set<ControlFlowKind>;
  /** Names of functions called directly by name (not as a property access). */
  calledNames: Set<string>;
}

/**
 * Analyzes a handler body in one pass, re-parsed with the TypeScript
 * compiler. Does not descend into a nested function's own body — a statement
 * inside a callback passed to another call (e.g. `.map()`) belongs to that
 * callback, not the handler. A call like `request.json()` has a property
 * access as its callee, not a plain identifier, so it is never collected as
 * a called name.
 */
function analyzeHandlerBody(body: ESTree.Node, sourceText: string): HandlerAnalysis {
  const start = body.range?.[0] ?? 0;
  const end = body.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "route.ts",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const kinds = new Set<ControlFlowKind>();
  const calledNames = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isTryStatement(node)) kinds.add("try");
    if (isLoop(node)) kinds.add("loop");
    if (ts.isIfStatement(node)) kinds.add("if");
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) calledNames.add(node.expression.text);
    if (isFunctionBoundary(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { kinds, calledNames };
}

const CONTROL_FLOW_MESSAGES: Record<ControlFlowKind, string> = {
  try: "a try statement",
  loop: "a loop",
  if: "an if statement",
};

function isFunctionLikeInit(node: ESTree.Expression | null | undefined): boolean {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

/** Names of functions declared at the top level of this file, whether exported or not. */
function collectLocallyDeclaredNames(programBody: ESTree.Program["body"]): Set<string> {
  const names = new Set<string>();
  for (const statement of programBody) {
    const declaration =
      statement.type === "ExportNamedDeclaration" && statement.declaration ? statement.declaration : statement;

    if (declaration.type === "FunctionDeclaration") {
      names.add(declaration.id.name);
    }
    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === "Identifier" && isFunctionLikeInit(declarator.init)) {
          names.add(declarator.id.name);
        }
      }
    }
  }
  return names;
}

export const routeHandlerShapeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a route.ts handler to be wrapped in withResponse, with no try, loop, or if of its own, and every function it calls imported rather than declared in route.ts.",
    },
  },
  create(context) {
    if (path.basename(context.filename) !== "route.ts") return {};

    const sourceText = context.sourceCode.text;

    function reportUnwrapped(node: Rule.Node, name: string): void {
      context.report({
        node,
        message:
          `Handler "${name}" must be wrapped in withResponse. ` +
          "See docs/next-codebase-guide/rules/route-handler-rule.md",
      });
    }

    function checkExport(node: Rule.Node, name: string, init: ESTree.Expression): void {
      // A bare re-exported reference (e.g. `export const POST = someImportedHandler;`)
      // isn't a recognizable call or function, so there is nothing to check.
      if (init.type === "Identifier") return;

      const boundary =
        init.type === "CallExpression" && init.callee.type === "Identifier" ? init.callee.name : undefined;

      if (boundary !== REQUIRED_BOUNDARY) {
        reportUnwrapped(node, name);
        return;
      }

      const handler = findHandler(init);
      if (!handler?.body) return;

      const { kinds, calledNames } = analyzeHandlerBody(handler.body, sourceText);
      for (const kind of kinds) {
        context.report({
          node,
          message:
            `Handler "${name}" contains ${CONTROL_FLOW_MESSAGES[kind]} of its own; delegate that to a function ` +
            "it calls. See docs/next-codebase-guide/rules/route-handler-rule.md",
        });
      }

      const localNames = collectLocallyDeclaredNames(context.sourceCode.ast.body);
      for (const calledName of calledNames) {
        if (localNames.has(calledName)) {
          context.report({
            node,
            message:
              `Handler "${name}" calls "${calledName}", which is declared in route.ts instead of imported. ` +
              "See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
      }
    }

    return {
      FunctionDeclaration(node: FunctionDeclarationNode) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        const name = node.id?.name;
        if (!exported || !name || !HTTP_METHODS.has(name) || !node.body) return;
        // A bare function declaration can never be wrapped by a call.
        reportUnwrapped(node, name);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        const exported = node.parent.parent?.type === "ExportNamedDeclaration";
        if (!exported || !HTTP_METHODS.has(name) || !node.init) return;
        checkExport(node, name, node.init);
      },
    };
  },
};
