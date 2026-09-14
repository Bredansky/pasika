/**
 * ESLint rule: pasika/with-response-helper
 *
 * A repository MUST define a `withResponse` helper, and that helper MUST be
 * the boundary the Route Handler Rule is written against: it awaits the
 * handler, validates the data the handler returns through the response schema,
 * answers a thrown HttpError with `{ data: null, message }` at the error's
 * status without letting a cache hold it, and rethrows anything else. The
 * shape half runs on every module that declares a function named
 * `withResponse`, wherever it sits, and reads the beats above out of its body
 * by role — the awaited call that runs the handler and the schema parse that
 * validates its data — so an overloaded definition passes whatever parameter
 * naming it chooses, and an overload signature, which has no body, is skipped.
 * Placement is the placement rules' business, not this one's. The existence
 * half runs on the repository's eslint config file, the one module every
 * repository has at its root, and asks the project index whether any module
 * under src/ exports `withResponse`.
 *
 * @see docs/pasika-adoption-guide/rules/with-response-helper-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type { FunctionDeclarationNode } from "../ast-types";
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
  answersUncached: boolean;
  rethrows: boolean;
}

/** The beats in the order a definition is checked, so a report reads top to bottom. */
const BEAT_KEYS: (keyof Beats)[] = [
  "awaitsHandler",
  "validatesWithSchema",
  "checksHttpError",
  "answersWithNullData",
  "usesErrorStatus",
  "answersUncached",
  "rethrows",
];

const BEAT_MESSAGES: Record<keyof Beats, string> = {
  awaitsHandler: "must await the handler",
  validatesWithSchema: "must validate the handler's returned data through the response schema",
  checksHttpError: "must check the caught error with instanceof HttpError",
  answersWithNullData: "must answer a thrown HttpError with { data: null, message }",
  usesErrorStatus: "must answer at the caught error's status",
  answersUncached: "must answer a failure with a response no cache may hold",
  rethrows: "must rethrow a caught error that is not an HttpError",
};

function isNamed(node: { name?: string } | null | undefined, name: string): boolean {
  return node?.name === name;
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

/** True for `await someFunction(...)`, the awaited call that runs the wrapped handler by role. */
function awaitsCall(node: ts.Node): boolean {
  return (
    ts.isAwaitExpression(node) && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)
  );
}

/** True for `someSchema.parse(...)` or `.safeParse(...)`, validation through a schema by role. */
function parsesThroughSchema(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text !== "JSON" &&
    (node.expression.name.text === "parse" || node.expression.name.text === "safeParse")
  );
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

/**
 * True for a `no-store` cache directive, the only directive that keeps a
 * failure response out of a shared cache — a 401 body served from one is not
 * the response its reader was refused.
 */
function answersUncached(node: ts.Node): boolean {
  return ts.isStringLiteralLike(node) && node.text.includes("no-store");
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
function collectBeats(text: string): Beats {
  const beats: Beats = {
    awaitsHandler: false,
    validatesWithSchema: false,
    checksHttpError: false,
    answersWithNullData: false,
    usesErrorStatus: false,
    answersUncached: false,
    rethrows: false,
  };

  const sourceFile = ts.createSourceFile("with-response.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tryStatement = findTryStatement(sourceFile);
  if (!tryStatement) return beats;

  beats.awaitsHandler = contains(tryStatement.tryBlock, awaitsCall);
  beats.validatesWithSchema = contains(tryStatement.tryBlock, parsesThroughSchema);

  const catchClause = tryStatement.catchClause;
  if (!catchClause) return beats;

  beats.checksHttpError = contains(catchClause.block, checksHttpError);
  beats.answersWithNullData = contains(catchClause.block, answersWithNullData);
  beats.usesErrorStatus = contains(catchClause.block, readsErrorStatus(caughtErrorName(catchClause)));
  beats.answersUncached = contains(catchClause.block, answersUncached);
  beats.rethrows = contains(catchClause.block, ts.isThrowStatement);

  return beats;
}

/** The caught error's binding name in a catch clause, `undefined` when the clause binds none. */
function caughtErrorName(catchClause: ts.CatchClause): string | undefined {
  const name = catchClause.variableDeclaration?.name;
  return name && ts.isIdentifier(name) ? name.text : undefined;
}

export const withResponseHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require a repository to define a ${HELPER} helper that validates the handler's data and maps a thrown HttpError to an uncached response.`,
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

    const check = (node: ESTree.Node): void => {
      const [start, end] = node.range ?? [0, context.sourceCode.text.length];
      const beats = collectBeats(context.sourceCode.text.slice(start, end));
      for (const beat of BEAT_KEYS) {
        if (beats[beat]) continue;
        context.report({
          node,
          message: `${HELPER} ${BEAT_MESSAGES[beat]}. See ${DOC}`,
        });
      }
    };

    return {
      FunctionDeclaration(node: FunctionDeclarationNode) {
        if (!isNamed(node.id, HELPER)) return;
        // An overload signature has no body to read beats from; only the
        // implementation definition is checked.
        if (!node.body) return;
        check(node);
      },
      VariableDeclarator(node) {
        if (!isNamed(node.id.type === "Identifier" ? node.id : null, HELPER)) return;
        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") return;
        check(init);
      },
    };
  },
};
