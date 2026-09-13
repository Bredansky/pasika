/**
 * ESLint rule: pasika/with-response-helper
 *
 * A repository MUST define a `withResponse` helper, and that helper MUST be
 * the boundary the Route Handler Rule is written against: it awaits the
 * handler, validates the data the handler returns through the response schema,
 * answers a thrown HttpError with `{ data: null, message }` at the error's
 * status, and rethrows anything else. The shape half runs on every module that
 * declares a function named `withResponse`, wherever it sits, and reads the
 * beats above out of its body — placement is the placement rules' business,
 * not this one's. The existence half runs on the repository's eslint config
 * file, the one module every repository has at its root, and asks the project
 * index whether any module under src/ exports `withResponse`.
 *
 * @see docs/pasika-adoption-guide/rules/with-response-helper-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import { getProjectIndex } from "../project/index";

const HELPER = "withResponse";
const DOC = "docs/pasika-adoption-guide/rules/with-response-helper-rule.md";
const ESLINT_CONFIG = /^eslint\.config\.(?:cjs|cts|js|mjs|mts|ts)$/;

interface Beats {
  awaitsHandler: boolean;
  validatesWithSchema: boolean;
  checksHttpError: boolean;
  answersWithNullData: boolean;
  usesErrorStatus: boolean;
  rethrows: boolean;
}

/** The beats in the order a definition is checked, so a report reads top to bottom. */
const BEAT_KEYS: (keyof Beats)[] = [
  "awaitsHandler",
  "validatesWithSchema",
  "checksHttpError",
  "answersWithNullData",
  "usesErrorStatus",
  "rethrows",
];

const BEAT_MESSAGES: Record<keyof Beats, string> = {
  awaitsHandler: "must await the handler",
  validatesWithSchema: "must validate the handler's returned data through the response schema",
  checksHttpError: "must check the caught error with instanceof HttpError",
  answersWithNullData: "must answer a thrown HttpError with { data: null, message }",
  usesErrorStatus: "must answer at the caught error's status",
  rethrows: "must rethrow a caught error that is not an HttpError",
};

function isNamed(node: ESTree.Identifier | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

/** The `src/` tree beside the eslint config this check runs on — its own folder is the repository root. */
function sourceRootFor(context: Rule.RuleContext): string {
  return path.join(path.dirname(path.resolve(context.filename)), "src");
}

/**
 * Whether any module under `src/` exports a value with this name, asked of the
 * project index. A tree with no `src/` folder has nothing to define and is not
 * in scope, so it passes.
 */
function definesHelper(context: Rule.RuleContext, name: string): boolean {
  const index = getProjectIndex(sourceRootFor(context));
  if (!index) return true;
  for (const parsed of index.modules.values()) {
    if (parsed.exports.some((exported) => exported.name === name)) return true;
  }
  return false;
}

/** Runs `check` over a subtree, stopping at the first node that matches. */
function contains(node: ts.Node, check: (node: ts.Node) => boolean): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (check(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function findTryStatement(node: ts.Node): ts.TryStatement | undefined {
  let found: ts.TryStatement | undefined;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (ts.isTryStatement(current)) {
      found = current;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/** True for `await handler(...)`, the call that runs the wrapped handler. */
function awaitsHandlerCall(handlerName: string | undefined) {
  return (node: ts.Node): boolean =>
    ts.isAwaitExpression(node) &&
    ts.isCallExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === handlerName;
}

/** True for `responseSchema.parse(...)`, the call that validates the returned data. */
function parsesThroughSchema(schemaName: string | undefined) {
  return (node: ts.Node): boolean =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === schemaName &&
    (node.expression.name.text === "parse" || node.expression.name.text === "safeParse");
}

/** True for `error instanceof HttpError`, the check that separates a modeled failure. */
function checksHttpError(node: ts.Node): boolean {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
    ts.isIdentifier(node.right) &&
    node.right.text === "HttpError"
  );
}

/** True for a `NextResponse.json({ data: null, ... })` call. */
function answersWithNullData(node: ts.Node): boolean {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== "json"
  ) {
    return false;
  }

  return node.arguments.some((argument) => {
    if (!ts.isObjectLiteralExpression(argument)) return false;
    return argument.properties.some((property) => {
      if (!ts.isPropertyAssignment(property)) return false;
      const name = ts.isIdentifier(property.name) ? property.name.text : undefined;
      return name === "data" && property.initializer.kind === ts.SyntaxKind.NullKeyword;
    });
  });
}

/** True for a read of the caught error's `status`. */
function readsErrorStatus(errorName: string | undefined) {
  return (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "status" &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === errorName;
}

/** Reads the canonical beats out of a definition's source text. */
function collectBeats(text: string, schemaName: string | undefined, handlerName: string | undefined): Beats {
  const beats: Beats = {
    awaitsHandler: false,
    validatesWithSchema: false,
    checksHttpError: false,
    answersWithNullData: false,
    usesErrorStatus: false,
    rethrows: false,
  };

  const sourceFile = ts.createSourceFile("with-response.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tryStatement = findTryStatement(sourceFile);
  if (!tryStatement) return beats;

  beats.awaitsHandler = contains(tryStatement.tryBlock, awaitsHandlerCall(handlerName));
  beats.validatesWithSchema = contains(tryStatement.tryBlock, parsesThroughSchema(schemaName));

  const catchClause = tryStatement.catchClause;
  if (!catchClause) return beats;

  const errorName = catchClause.variableDeclaration?.name;
  const caughtName = errorName && ts.isIdentifier(errorName) ? errorName.text : undefined;
  beats.checksHttpError = contains(catchClause.block, checksHttpError);
  beats.answersWithNullData = contains(catchClause.block, answersWithNullData);
  beats.usesErrorStatus = contains(catchClause.block, readsErrorStatus(caughtName));
  beats.rethrows = contains(catchClause.block, ts.isThrowStatement);

  return beats;
}

/** The declared parameter names of a function-like node, `undefined` for a non-identifier pattern. */
function parameterNames(node: ESTree.Node): (string | undefined)[] {
  if (
    node.type !== "FunctionDeclaration" &&
    node.type !== "FunctionExpression" &&
    node.type !== "ArrowFunctionExpression"
  ) {
    return [];
  }
  return node.params.map((parameter) => (parameter.type === "Identifier" ? parameter.name : undefined));
}

export const withResponseHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require a repository to define a ${HELPER} helper that validates the handler's data and maps a thrown HttpError to a response.`,
    },
  },
  create(context) {
    if (ESLINT_CONFIG.test(path.basename(context.filename))) {
      return {
        Program() {
          if (definesHelper(context, HELPER)) return;
          context.report({
            node: context.sourceCode.ast,
            loc: { line: 1, column: 0 },
            message: `A repository must define a ${HELPER} helper. See ${DOC}`,
          });
        },
      };
    }

    const check = (node: ESTree.Node, parameters: (string | undefined)[]): void => {
      const [start, end] = node.range ?? [0, context.sourceCode.text.length];
      const beats = collectBeats(context.sourceCode.text.slice(start, end), parameters[0], parameters[1]);
      for (const beat of BEAT_KEYS) {
        if (beats[beat]) continue;
        context.report({
          node,
          message: `${HELPER} ${BEAT_MESSAGES[beat]}. See ${DOC}`,
        });
      }
    };

    return {
      FunctionDeclaration(node) {
        if (isNamed(node.id, HELPER)) check(node, parameterNames(node));
      },
      VariableDeclarator(node) {
        if (!isNamed(node.id.type === "Identifier" ? node.id : null, HELPER)) return;
        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") return;
        check(init, parameterNames(init));
      },
    };
  },
};
