/**
 * ESLint rule: pasika/http-error-usage
 *
 * A delegated module MUST report a failure by throwing an HttpError — never
 * another error type, never a returned value. A module is delegated because the
 * pipeline reaches it: the modules a `route.ts` reaches are read out of the
 * project index, and everything no route reaches is out of scope.
 *
 * Never another error type: `withResponse` answers a thrown HttpError and
 * rethrows anything else, so a plain Error from a module a handler's awaited
 * calls reach leaves the client with a bare 500 and none of the response shape
 * the rest of the pipeline promises. A class named here passes when it extends
 * HttpError, directly or through the modules that declare it, since a subclass
 * is still an HttpError to the wrapper's `instanceof` check.
 *
 * Never a returned value: returning an HttpError inside an async function
 * resolves that function's promise with it as an ordinary value instead of
 * rejecting it — an awaited caller receives it as if it were legitimate data,
 * not a failure. The check covers every position a value is handed back from: a
 * `return` of one outright, the same expression behind a conditional or `||`,
 * and a concise arrow body, which has no ReturnStatement at all.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import { getProjectIndex, resolveSpecifier, type ProjectIndex } from "../project/index";
import { sourceRootOf } from "./project-root";

const HTTP_ERROR = "HttpError";
const ROUTE_FILE = "route.ts";
const DOC = "docs/next-codebase-guide/rules/route-handler-rule.md";
/** How far a class's `extends` chain is followed across files before giving up. */
const HERITAGE_DEPTH = 5;

const HANDS_ERROR_BACK = `A delegated module must throw the HttpError it reports a failure with, not return it. See ${DOC}`;

const delegatedModuleMessage = (name: string): string =>
  `A delegated module must report a failure by throwing an HttpError, not "${name}". See ${DOC}`;

/**
 * The error class a handed-back expression constructs, if it constructs one.
 *
 * Walks the positions a failure reaches a caller through — the branches of a
 * conditional, the operands of `||` and `??`, the arguments of a wrapping call
 * such as `Promise.resolve(...)` — and stops at a nested function, whose own
 * body belongs to whoever calls it.
 */
function constructedErrorName(node: ESTree.Expression | ESTree.SpreadElement | undefined): string | undefined {
  if (node === undefined) return undefined;

  if (node.type === "NewExpression") {
    return node.callee.type === "Identifier" ? node.callee.name : undefined;
  }
  if (node.type === "AwaitExpression") return constructedErrorName(node.argument);
  if (node.type === "ConditionalExpression") {
    return constructedErrorName(node.consequent) ?? constructedErrorName(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return constructedErrorName(node.left) ?? constructedErrorName(node.right);
  }
  if (node.type !== "CallExpression") return undefined;

  for (const argument of node.arguments) {
    const found = constructedErrorName(argument);
    if (found) return found;
  }
  return undefined;
}

/** The name a class in this file extends, undefined when the file declares no such class. */
function parentClassOf(file: string, name: string): string | undefined {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }

  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || statement.name?.text !== name) continue;
    const heritage = statement.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword);
    const parent = heritage?.types[0]?.expression;
    return parent && ts.isIdentifier(parent) ? parent.text : undefined;
  }
  return undefined;
}

/** The file this module's imports bring `name` from, if they bring it at all. */
function importedFrom(file: string, name: string, sourceRoot: string, index: ProjectIndex): string | undefined {
  const module = index.modules.get(path.resolve(file));
  const moduleImport = module?.imports.find((entry) => entry.names.includes(name));
  if (!moduleImport) return undefined;
  return resolveSpecifier(file, moduleImport.specifier, sourceRoot);
}

/** Whether `name`, declared in or imported by `file`, is an HttpError or extends one. */
function isHttpErrorClass(file: string, name: string, sourceRoot: string, index: ProjectIndex): boolean {
  let currentFile = path.resolve(file);
  let currentName = name;

  for (let depth = 0; depth <= HERITAGE_DEPTH; depth += 1) {
    if (currentName === HTTP_ERROR) return true;

    const parent = parentClassOf(currentFile, currentName);
    if (parent) {
      currentName = parent;
      continue;
    }

    const imported = importedFrom(currentFile, currentName, sourceRoot, index);
    if (!imported) return false;
    currentFile = imported;
    // The name is unchanged: the same class, now read where it is declared.
  }

  return false;
}

let pipelineCache: { index: ProjectIndex; files: Set<string> } | undefined;

/**
 * Every module a `route.ts` reaches through its imports — the pipeline the
 * glossary defines, which is what makes a module delegated rather than free
 * standing. Memoized per index, since ESLint asks once per linted file.
 */
function pipelineFiles(sourceRoot: string): Set<string> | undefined {
  const index = getProjectIndex(sourceRoot);
  if (!index) return undefined;
  if (pipelineCache?.index === index) return pipelineCache.files;

  const files = new Set<string>();
  const queue = [...index.modules.keys()].filter((file) => path.basename(file) === ROUTE_FILE);

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);

    for (const moduleImport of index.modules.get(file)?.imports ?? []) {
      const target = resolveSpecifier(file, moduleImport.specifier, index.sourceRoot);
      if (target && index.modules.has(target) && !files.has(target)) queue.push(target);
    }
  }

  pipelineCache = { index, files };
  return files;
}

export const httpErrorUsageRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a delegated module to report a failure by throwing an HttpError, never another error type and never a returned value.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);

    // Resolved once per file: the answer is the same for every node in it, and
    // the index scan behind it is shared across the whole lint run.
    let delegated: boolean | undefined;
    function inPipeline(): boolean {
      delegated ??= pipelineFiles(sourceRoot)?.has(file) ?? false;
      return delegated;
    }

    return {
      ReturnStatement(node) {
        if (node.argument === null) return;
        if (!inPipeline()) return;
        if (constructedErrorName(node.argument) !== HTTP_ERROR) return;
        context.report({ node, message: HANDS_ERROR_BACK });
      },

      ArrowFunctionExpression(node) {
        if (node.body.type === "BlockStatement") return;
        if (!inPipeline()) return;
        if (constructedErrorName(node.body) !== HTTP_ERROR) return;
        context.report({ node, message: HANDS_ERROR_BACK });
      },

      ThrowStatement(node) {
        const thrown = node.argument;
        if (thrown.type !== "NewExpression" || thrown.callee.type !== "Identifier") return;

        const name = thrown.callee.name;
        if (name === HTTP_ERROR) return;

        const index = getProjectIndex(sourceRoot);
        if (!index || !inPipeline()) return;
        if (isHttpErrorClass(file, name, sourceRoot, index)) return;

        context.report({ node, message: delegatedModuleMessage(name) });
      },
    };
  },
};
