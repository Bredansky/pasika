/**
 * ESLint rule: pasika/route-handler-shape
 *
 * An HTTP method handler exported from route.ts MUST NOT contain a try
 * statement, a loop, or an if statement in its body, MUST declare its return
 * type as Promise<NextResponse<X>> with a concrete X, MUST thread every
 * delegated call after its first through andThen, and MUST resolve its final
 * Result by calling respond. Branching, looping, and failure handling belong
 * to a delegated module that reports its outcome as a value instead of the
 * handler catching, looping, or branching on it directly, and the pipeline
 * those values move through is andThen and respond, not ad hoc composition.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** FunctionDeclaration as seen by a rule visitor, with its return type annotation and parameters. */
type RouteFunctionDeclarationNode = FunctionDeclarationNode & ReturnTypeAnnotated & { params?: ESTree.Pattern[] };

type FunctionLike = (ESTree.ArrowFunctionExpression | ESTree.FunctionExpression) & ReturnTypeAnnotated;

/**
 * The `: T` return type annotation the typescript-eslint parser attaches to a
 * function node; plain `estree` types don't declare it.
 */
interface ReturnTypeAnnotated {
  returnType?: { typeAnnotation?: TsTypeReferenceNode } | null;
}

/** TSTypeReference — `Name<Args>` — as seen by the typescript-eslint parser. */
interface TsTypeReferenceNode {
  type?: string;
  typeName?: { type?: string; name?: string };
  typeArguments?: { params?: TsTypeReferenceNode[] };
}

function isFunctionLike(node: ESTree.Node): node is FunctionLike {
  return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

/**
 * Finds the function that actually runs, which may sit behind one or more
 * wrapping calls (`withUserId(async (userId, request) => { ... })`).
 */
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

/** Whether a type node is `NextResponse<X>` with a concrete `X`. */
function isTypedNextResponse(node: TsTypeReferenceNode | undefined): boolean {
  if (node?.type !== "TSTypeReference") return false;
  if (node.typeName?.name !== "NextResponse") return false;
  return (node.typeArguments?.params?.length ?? 0) > 0;
}

/** Whether a function's declared return type is `Promise<NextResponse<X>>` with a concrete `X`. */
function hasTypedResponseReturn(node: ReturnTypeAnnotated): boolean {
  const annotation = node.returnType?.typeAnnotation;
  if (annotation?.type !== "TSTypeReference") return false;
  if (annotation.typeName?.name !== "Promise") return false;
  return isTypedNextResponse(annotation.typeArguments?.params?.[0]);
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

/** Whether a node is a `NextResponse.json(...)` call. */
function isNextResponseJsonCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "NextResponse" &&
    ts.isIdentifier(callee.name) &&
    callee.name.text === "json"
  );
}

/** Whether a call's callee is the bare identifier `name` (e.g. `andThen(...)`, `respond(...)`). */
function isCallTo(node: ts.Node, name: string): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name;
}

/** Whether a call reads the incoming request, e.g. `request.json()` or `req.headers.get()`. */
function isRequestRead(call: ts.CallExpression, requestParamNames: Set<string>): boolean {
  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  let receiver: ts.Expression = call.expression.expression;
  while (ts.isPropertyAccessExpression(receiver)) receiver = receiver.expression;
  return ts.isIdentifier(receiver) && requestParamNames.has(receiver.text);
}

type ControlFlowKind = "try" | "loop" | "if" | "response";

interface HandlerAnalysis {
  kinds: Set<ControlFlowKind>;
  /** Awaited calls other than a request read or `andThen(...)` — only the first may stay bare. */
  bareDelegatedAwaits: number;
  callsRespond: boolean;
}

/**
 * Analyzes a handler body in one pass, re-parsed with the TypeScript
 * compiler the same way hook-complexity walks a hook body. Does not descend
 * into a nested function's own body — a statement or call inside a callback
 * passed to another call (e.g. `.map()`) belongs to that callback, not the
 * handler. Runs on both a block body and a concise arrow expression body,
 * since a bare `NextResponse.json(...)` call can appear directly as one.
 */
function analyzeHandlerBody(body: ESTree.Node, sourceText: string, requestParamNames: Set<string>): HandlerAnalysis {
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
  let bareDelegatedAwaits = 0;
  let callsRespond = false;

  const visit = (node: ts.Node): void => {
    if (ts.isTryStatement(node)) kinds.add("try");
    if (isLoop(node)) kinds.add("loop");
    if (ts.isIfStatement(node)) kinds.add("if");
    if (isNextResponseJsonCall(node)) kinds.add("response");
    if (isCallTo(node, "respond")) callsRespond = true;
    if (
      ts.isAwaitExpression(node) &&
      ts.isCallExpression(node.expression) &&
      !isCallTo(node.expression, "andThen") &&
      !isRequestRead(node.expression, requestParamNames)
    ) {
      bareDelegatedAwaits += 1;
    }
    if (isFunctionBoundary(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { kinds, bareDelegatedAwaits, callsRespond };
}

const CONTROL_FLOW_MESSAGES: Record<ControlFlowKind, string> = {
  try: "a try statement",
  loop: "a loop",
  if: "an if statement",
  response: "a NextResponse.json call",
};

export const routeHandlerShapeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a route.ts handler to have no try, loop, or if of its own, thread delegated calls through andThen, resolve through respond, and declare its return type as Promise<NextResponse<X>>.",
    },
  },
  create(context) {
    if (path.basename(context.filename) !== "route.ts") return {};

    const sourceText = context.sourceCode.text;

    function checkHandler(
      node: Rule.Node,
      name: string,
      handler: FunctionLike | RouteFunctionDeclarationNode,
      params: ESTree.Pattern[],
    ): void {
      if (!handler.body) return;

      const requestParamNames = new Set(
        params.filter((param): param is ESTree.Identifier => param.type === "Identifier").map((param) => param.name),
      );
      const { kinds, bareDelegatedAwaits, callsRespond } = analyzeHandlerBody(
        handler.body,
        sourceText,
        requestParamNames,
      );

      for (const kind of kinds) {
        context.report({
          node,
          message:
            `Handler "${name}" contains ${CONTROL_FLOW_MESSAGES[kind]} of its own; delegate to a module that ` +
            "reports its outcome as a value instead. See docs/next-codebase-guide/rules/route-handler-rule.md",
        });
      }

      if (bareDelegatedAwaits > 1) {
        context.report({
          node,
          message:
            `Handler "${name}" awaits more than one delegated call directly; thread each one after the first ` +
            "through andThen. See docs/next-codebase-guide/rules/route-handler-rule.md",
        });
      }

      if (!callsRespond) {
        context.report({
          node,
          message:
            `Handler "${name}" must resolve its response by calling respond. ` +
            "See docs/next-codebase-guide/rules/route-handler-rule.md",
        });
      }

      if (!hasTypedResponseReturn(handler)) {
        context.report({
          node,
          message:
            `Handler "${name}" must declare its return type as Promise<NextResponse<X>> with a concrete X. ` +
            "See docs/next-codebase-guide/rules/route-handler-rule.md",
        });
      }
    }

    return {
      FunctionDeclaration(node: RouteFunctionDeclarationNode) {
        const exported = node.parent?.type === "ExportNamedDeclaration";
        const name = node.id?.name;
        if (!exported || !name || !HTTP_METHODS.has(name) || !node.body) return;
        checkHandler(node, name, node, node.params ?? []);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        const exported = node.parent.parent?.type === "ExportNamedDeclaration";
        if (!exported || !HTTP_METHODS.has(name) || !node.init) return;

        const handler = findHandler(node.init);
        if (handler) checkHandler(node, name, handler, handler.params);
      },
    };
  },
};
