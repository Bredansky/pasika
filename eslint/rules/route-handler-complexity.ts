/**
 * ESLint rule: pasika/route-handler-complexity
 *
 * An HTTP method handler exported from route.ts MUST be extracted to a named
 * function outside src/app/ once its extraction score reaches two: each
 * awaited call other than one reading the incoming request adds one, and a
 * loop that contains such a call adds one more. A bare try/catch around a
 * single delegated call does not add to the score on its own — that is
 * already the thin shape this rule wants, not a reason to extract further.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** FunctionDeclaration as seen by a rule visitor, with its parameter list. */
type RouteFunctionDeclarationNode = FunctionDeclarationNode & { params?: ESTree.Pattern[] };

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression;

function isFunctionLike(node: ESTree.Node): node is FunctionLike {
  return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

/**
 * Finds the block statement that actually runs, which may sit behind one or
 * more wrapping calls (`withUserId(async (userId, request) => { ... })`).
 * Returns the wrapping function's own parameters too, since those — not the
 * outer wrapper's — are what the body's request-reading calls are made on.
 */
function findHandler(node: ESTree.Expression): { body: ESTree.BlockStatement; params: ESTree.Pattern[] } | undefined {
  if (isFunctionLike(node)) {
    return node.body.type === "BlockStatement" ? { body: node.body, params: node.params } : undefined;
  }
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

/**
 * Scores a handler body for extraction: one point for each awaited call
 * other than one reading the incoming request (e.g. `request.json()`), plus
 * one more if a loop contains at least one such call — a loop that fans an
 * external call out over a collection is doing more work than the one call
 * site suggests. Re-parses the body's source slice with the TypeScript
 * compiler so the walk stays fully typed, the same technique hook-complexity
 * uses for hook bodies.
 */
function computeExtractionScore(body: ESTree.BlockStatement, params: ESTree.Pattern[], sourceText: string): number {
  const requestParamNames = new Set(
    params.filter((param): param is ESTree.Identifier => param.type === "Identifier").map((param) => param.name),
  );

  const start = body.range?.[0] ?? 0;
  const end = body.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "route.ts",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const isRequestRead = (call: ts.CallExpression): boolean => {
    if (!ts.isPropertyAccessExpression(call.expression)) return false;
    let receiver: ts.Expression = call.expression.expression;
    while (ts.isPropertyAccessExpression(receiver)) receiver = receiver.expression;
    return ts.isIdentifier(receiver) && requestParamNames.has(receiver.text);
  };

  const isExternalCall = (node: ts.Node): boolean =>
    ts.isAwaitExpression(node) && ts.isCallExpression(node.expression) && !isRequestRead(node.expression);

  const containsExternalCall = (node: ts.Node): boolean => {
    if (isExternalCall(node)) return true;
    return ts.forEachChild(node, containsExternalCall) === true;
  };

  let externalCallCount = 0;
  let loopBonus = 0;
  const visit = (node: ts.Node): void => {
    if (isExternalCall(node)) externalCallCount += 1;
    if (loopBonus === 0 && isLoop(node) && containsExternalCall(node)) loopBonus = 1;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return externalCallCount + loopBonus;
}

export const routeHandlerComplexityRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a complex route.ts handler to be extracted to a named function outside src/app/.",
    },
  },
  create(context) {
    if (path.basename(context.filename) !== "route.ts") return {};

    const sourceText = context.sourceCode.text;

    function report(node: Rule.Node, name: string, score: number): void {
      context.report({
        node,
        message:
          `Handler "${name}" has an extraction score of ${String(score)} and must be extracted to a named ` +
          "function outside src/app/. See docs/next-codebase-guide/rules/route-handler-rule.md",
      });
    }

    function checkHandler(node: Rule.Node, name: string, body: ESTree.BlockStatement, params: ESTree.Pattern[]): void {
      const score = computeExtractionScore(body, params, sourceText);
      if (score >= 2) report(node, name, score);
    }

    return {
      FunctionDeclaration(node: RouteFunctionDeclarationNode) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        const name = node.id?.name;
        if (!exported || !name || !HTTP_METHODS.has(name) || !node.body) return;
        checkHandler(node, name, node.body, node.params ?? []);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        const exported = node.parent.parent?.type === "ExportNamedDeclaration";
        if (!exported || !HTTP_METHODS.has(name) || !node.init) return;

        const handler = findHandler(node.init);
        if (handler) checkHandler(node, name, handler.body, handler.params);
      },
    };
  },
};
