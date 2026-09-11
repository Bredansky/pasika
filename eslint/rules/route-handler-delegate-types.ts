/**
 * ESLint rule: pasika/route-handler-delegate-types
 *
 * A function a route handler delegates to MUST declare its return type as
 * Result. route-handler-shape requires the handler to thread delegated
 * calls through andThen (or leave exactly one bare), and result-pipeline-types
 * verifies andThen and respond propagate that constraint — but neither
 * checks the delegated function itself. Resolves each delegated call back to
 * its defining file through the project index (the same cross-file
 * resolution enforce-cn-merge uses) and checks that export's own declared
 * return type.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import { getProjectIndex, resolveSpecifier } from "../project/index";
import { sourceRootOf } from "./project-root";
import type { FunctionDeclarationNode } from "../ast-types";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** FunctionDeclaration as seen by a rule visitor, with its parameter list. */
type RouteFunctionDeclarationNode = FunctionDeclarationNode & { params?: ESTree.Pattern[] };

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

function isCallTo(node: ts.Node, name: string): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name;
}

function isRequestRead(call: ts.CallExpression, requestParamNames: Set<string>): boolean {
  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  let receiver: ts.Expression = call.expression.expression;
  while (ts.isPropertyAccessExpression(receiver)) receiver = receiver.expression;
  return ts.isIdentifier(receiver) && requestParamNames.has(receiver.text);
}

function isFunctionBoundary(node: ts.Node): boolean {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isFunctionDeclaration(node);
}

function calleeNameOf(call: ts.CallExpression): string | undefined {
  return ts.isIdentifier(call.expression) ? call.expression.text : undefined;
}

/** The call an andThen `next` callback delegates to, whether its body is a concise expression or a block. */
function delegatedCallOf(next: ts.Expression): ts.CallExpression | undefined {
  if (!ts.isArrowFunction(next) && !ts.isFunctionExpression(next)) return undefined;
  if (ts.isCallExpression(next.body)) return next.body;
  if (ts.isBlock(next.body)) {
    for (const statement of next.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression && ts.isCallExpression(statement.expression)) {
        return statement.expression;
      }
    }
  }
  return undefined;
}

/**
 * Finds the name of every function a route handler delegates to: the first
 * bare-awaited call (excluding a request read) and the call inside each
 * `andThen(...)` next callback. Does not descend into a nested function's
 * own body, the same scoping every other check in this rule family uses.
 */
function collectDelegatedCallNames(body: ESTree.Node, sourceText: string, requestParamNames: Set<string>): string[] {
  const start = body.range?.[0] ?? 0;
  const end = body.range?.[1] ?? sourceText.length;
  const sourceFile = ts.createSourceFile(
    "route.ts",
    sourceText.slice(start, end),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isAwaitExpression(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      if (isCallTo(call, "andThen")) {
        const next = call.arguments[1];
        const delegatedCall = next && delegatedCallOf(next);
        const name = delegatedCall && calleeNameOf(delegatedCall);
        if (name) names.push(name);
      } else if (!isRequestRead(call, requestParamNames)) {
        const name = calleeNameOf(call);
        if (name) names.push(name);
      }
    }
    if (isFunctionBoundary(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

export const routeHandlerDelegateTypesRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a function a route handler delegates to declare its return type as Result.",
    },
  },
  create(context) {
    if (path.basename(context.filename) !== "route.ts") return {};

    const sourceText = context.sourceCode.text;
    const sourceRoot = sourceRootOf(context);
    const routeFile = path.resolve(context.filename);

    function importSpecifierFor(name: string): string | undefined {
      for (const statement of context.sourceCode.ast.body) {
        if (statement.type !== "ImportDeclaration") continue;
        for (const specifier of statement.specifiers) {
          if (specifier.type === "ImportSpecifier" && specifier.local.name === name) {
            return typeof statement.source.value === "string" ? statement.source.value : undefined;
          }
        }
      }
      return undefined;
    }

    function returnsResult(name: string): boolean | undefined {
      const specifier = importSpecifierFor(name);
      if (!specifier) return undefined;
      const targetFile = resolveSpecifier(routeFile, specifier, sourceRoot);
      if (!targetFile) return undefined;
      const targetModule = getProjectIndex(sourceRoot)?.modules.get(targetFile);
      const exportEntry = targetModule?.exports.find((entry) => entry.name === name);
      return exportEntry?.returnsResult;
    }

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
      const delegatedNames = collectDelegatedCallNames(handler.body, sourceText, requestParamNames);

      for (const delegatedName of delegatedNames) {
        if (returnsResult(delegatedName) === false) {
          context.report({
            node,
            message:
              `Handler "${name}" delegates to "${delegatedName}", which does not declare its return type as ` +
              "Result. See docs/next-codebase-guide/rules/route-handler-rule.md",
          });
        }
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
