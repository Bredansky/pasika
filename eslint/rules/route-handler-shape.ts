/**
 * ESLint rule: pasika/route-handler-shape
 *
 * An HTTP method handler exported from route.ts MUST NOT contain a try
 * statement, a loop, or an if statement in its body, and MUST declare its
 * return type as Promise<NextResponse<X>> with a concrete X. Branching,
 * looping, and failure handling belong to a delegated module that reports
 * its outcome as a value instead of the handler catching, looping, or
 * branching on it directly.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** FunctionDeclaration as seen by a rule visitor, with its return type annotation. */
type RouteFunctionDeclarationNode = FunctionDeclarationNode & ReturnTypeAnnotated;

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

type ControlFlowKind = "try" | "loop" | "if";

/**
 * Finds every control-flow kind present directly in a handler body, re-parsed
 * with the TypeScript compiler the same way hook-complexity walks a hook
 * body. Does not descend into a nested function's own body — a statement
 * inside a callback passed to another call (e.g. `.map()`) is that
 * callback's control flow, not the handler's.
 */
function findControlFlowKinds(body: ESTree.BlockStatement, sourceText: string): Set<ControlFlowKind> {
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
  const visit = (node: ts.Node): void => {
    if (ts.isTryStatement(node)) kinds.add("try");
    if (isLoop(node)) kinds.add("loop");
    if (ts.isIfStatement(node)) kinds.add("if");
    if (isFunctionBoundary(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return kinds;
}

const CONTROL_FLOW_MESSAGES: Record<ControlFlowKind, string> = {
  try: "a try statement",
  loop: "a loop",
  if: "an if statement",
};

export const routeHandlerShapeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a route.ts handler to have no try, loop, or if of its own, and to declare its return type as Promise<NextResponse<X>>.",
    },
  },
  create(context) {
    if (path.basename(context.filename) !== "route.ts") return {};

    const sourceText = context.sourceCode.text;

    function checkHandler(node: Rule.Node, name: string, handler: FunctionLike | RouteFunctionDeclarationNode): void {
      if (handler.body?.type === "BlockStatement") {
        const kinds = findControlFlowKinds(handler.body, sourceText);
        for (const kind of kinds) {
          context.report({
            node,
            message:
              `Handler "${name}" contains ${CONTROL_FLOW_MESSAGES[kind]} of its own; delegate to a module that ` +
              "reports its outcome as a value instead. See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
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
        checkHandler(node, name, node);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        const exported = node.parent.parent?.type === "ExportNamedDeclaration";
        if (!exported || !HTTP_METHODS.has(name) || !node.init) return;

        const handler = findHandler(node.init);
        if (handler) checkHandler(node, name, handler);
      },
    };
  },
};
