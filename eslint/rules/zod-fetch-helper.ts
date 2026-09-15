/**
 * ESLint rule: pasika/zod-fetch-helper
 *
 * A repository MUST define a `zodFetch` helper, every outbound request MUST go
 * through it, and that helper MUST be the boundary that turns an upstream
 * response into data or a failure: it reads the status, throws an error
 * carrying the status and the body an upstream failure reported, validates a
 * JSON body through the response schema, and hands back the body, status and headers of a
 * response it does not decode — a body it parses as a stream and hands on unread. The shape half runs on every module that
 * declares a function named `zodFetch`, wherever it sits, and reads the beats
 * above out of its body — placement is the placement rules' business, not this
 * one's. The existence half runs on the repository's eslint config file, the
 * one module every repository has at its root, and asks the project index
 * whether any module under src/ exports `zodFetch`. The remaining half runs on
 * every other module: a call to `fetch` there is a request that skipped the
 * helper, so it is reported where it is written.
 *
 * @see docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import { getProjectIndex } from "../project/index";

const HELPER = "zodFetch";
const DOC = "docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";
const ESLINT_CONFIG = /^eslint\.config\.(?:cjs|cts|js|mjs|mts|ts)$/;
interface Beats {
  callsFetch: boolean;
  readsStatus: boolean;
  throwsStatusError: boolean;
  carriesFailureBody: boolean;
  parsesStreamBody: boolean;
  validatesWithSchema: boolean;
  handsBackBody: boolean;
}

/** The beats in the order a definition is checked, so a report reads top to bottom. */
const BEAT_KEYS: (keyof Beats)[] = [
  "callsFetch",
  "readsStatus",
  "throwsStatusError",
  "carriesFailureBody",
  "parsesStreamBody",
  "validatesWithSchema",
  "handsBackBody",
];

const BEAT_MESSAGES: Record<keyof Beats, string> = {
  callsFetch: "must be the module that calls fetch",
  readsStatus: "must read the response status",
  throwsStatusError: "must throw an error carrying the status the upstream reported",
  carriesFailureBody: "must carry the body a failed response answered with",
  parsesStreamBody: "must parse the body it hands back as a stream",
  validatesWithSchema: "must validate the JSON body through the response schema",
  handsBackBody: "must hand back the body of a response it does not decode",
};

/** Reported when a caller that relays the body would receive bytes the helper has already read. */
const DECODED_BODY_MESSAGE = "must not decode the body it hands back";

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

/** True for a `fetch(...)` call — the request the helper exists to own. */
function callsFetch(node: ts.Node): boolean {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch";
}

/** True for a read of the response's `ok` or `status`. */
function readsStatus(node: ts.Node): boolean {
  return ts.isPropertyAccessExpression(node) && (node.name.text === "ok" || node.name.text === "status");
}

/** True for a condition that reads the status, the branch the failure path hangs off. */
function branchesOnStatus(node: ts.Node): boolean {
  if (!ts.isIfStatement(node)) return false;

  let reads = false;
  const visit = (current: ts.Node): void => {
    if (reads) return;
    if (readsStatus(current)) {
      reads = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node.expression);
  return reads;
}

/** True for a `throw new …` whose construction is handed the upstream status. */
function throwsStatusError(node: ts.Node): boolean {
  if (!ts.isThrowStatement(node)) return false;
  const thrown = node.expression;
  if (!ts.isNewExpression(thrown)) return false;

  let carriesStatus = false;
  const visit = (current: ts.Node): void => {
    if (carriesStatus) return;
    // A message that names the status is text, not the status handed to the error.
    if (ts.isStringLiteralLike(current) || ts.isTemplateExpression(current)) return;
    if (ts.isPropertyAccessExpression(current) && current.name.text === "status") {
      carriesStatus = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  for (const argument of thrown.arguments ?? []) visit(argument);
  return carriesStatus;
}

/** The name a call's object answers to — `responseSchema` in a destructured call, `options.responseSchema` in a plain one. */
function schemaNameOf(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  return ts.isPropertyAccessExpression(node) ? node.name.text : undefined;
}

/** True for `schema.parse(...)`, the call that holds a body to the schema a call site named. */
function parsesThroughSchema(node: ts.Node, schemaName: string): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) return false;
  if (callee.name.text !== "parse" && callee.name.text !== "safeParse") return false;
  return schemaNameOf(callee.expression) === schemaName;
}

/** True for `responseSchema.parse(...)`, the call that validates a decoded body. */
function validatesWithSchema(node: ts.Node): boolean {
  return parsesThroughSchema(node, "responseSchema");
}

/** True for `streamBody.parse(...)`, the call that holds a body a caller relays to the stream contract. */
function parsesStreamBody(node: ts.Node): boolean {
  return parsesThroughSchema(node, "streamBody");
}

/** The value a returned object literal hands back as its `body`, the part a caller that relays it needs. */
function handedBackBody(node: ts.Node): ts.Expression | undefined {
  if (!ts.isReturnStatement(node) || !node.expression) return undefined;
  if (!ts.isObjectLiteralExpression(node.expression)) return undefined;

  for (const property of node.expression.properties) {
    if (ts.isPropertyAssignment(property) && property.name.getText() === "body") return property.initializer;
    if (ts.isShorthandPropertyAssignment(property) && property.name.getText() === "body") return property.name;
  }
  return undefined;
}

/** True for a returned object carrying a `body`. */
function handsBackBody(node: ts.Node): boolean {
  return handedBackBody(node) !== undefined;
}

/** The reads that consume a response body, leaving a caller that relays it nothing to pass on. */
const BODY_DECODERS = new Set(["json", "text", "arrayBuffer", "blob", "bytes", "formData"]);

/** True for `response.json()` or `await response.text()` — a call that consumes a body. */
function decodesBody(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    BODY_DECODERS.has(node.expression.name.text)
  );
}

/** True when a read of a body happens anywhere inside this node. */
function readsBody(node: ts.Node): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (decodesBody(current)) found = true;
    else ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/** True for a name written as a property — `response.body` — which is not a value in scope. */
function isPropertyName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent)) return parent.name === node;
  if (ts.isPropertyAssignment(parent)) return parent.name === node;
  return false;
}

/** True when an expression reads one of these names as a value. */
function carriesName(node: ts.Node, names: ReadonlySet<string>): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current) && names.has(current.text) && !isPropertyName(current)) found = true;
    else ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/** The names a read of a response body was bound to, for the two questions asked of them. */
interface BodyNames {
  /** Every name any declaration bound to a body read — what a throw has to carry. */
  carried: ReadonlySet<string>;
  /** Only the names every one of their declarations bound to a body read — a body nothing else holds. */
  decoded: ReadonlySet<string>;
}

/**
 * A name declared more than once is in `carried` alone: one of its declarations
 * reading a body is enough for a throw to be carrying one, while a return that
 * hands the name back is only handing back a body already read when no other
 * declaration of it says otherwise.
 */
function bodyReadNames(sourceFile: ts.SourceFile): BodyNames {
  const reads = new Map<string, boolean[]>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const declarations = reads.get(node.name.text) ?? [];
      declarations.push(readsBody(node.initializer));
      reads.set(node.name.text, declarations);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const carried = new Set<string>();
  const decoded = new Set<string>();
  for (const [name, declarations] of reads) {
    if (!declarations.some(Boolean)) continue;
    carried.add(name);
    if (declarations.every(Boolean)) decoded.add(name);
  }
  return { carried, decoded };
}

/**
 * Whether a throw is handed the body a failure read — as the read itself, or as
 * the name it was bound to. A caller logs that body, and a module that knows the
 * upstream's failure shape names the reason out of it, so a throw without it
 * leaves the failure with nothing but its status.
 */
function throwsBody(sourceFile: ts.SourceFile): boolean {
  const { carried } = bodyReadNames(sourceFile);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isThrowStatement(node) && ts.isNewExpression(node.expression)) {
      for (const argument of node.expression.arguments ?? []) {
        if (readsBody(argument) || carriesName(argument, carried)) {
          found = true;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Whether a body handed back to a caller is one the helper already decoded —
 * whether the read is written at the return itself or bound to a name that is
 * returned. A decoded read consumes the response, so the caller receives bytes
 * it cannot relay, which for the branch that exists to relay them is the whole
 * loss.
 */
function handsBackDecodedBody(text: string): boolean {
  const sourceFile = parseBody(text);
  const { decoded } = bodyReadNames(sourceFile);

  let found = false;
  const check = (node: ts.Node): void => {
    if (found) return;
    const body = handedBackBody(node);
    if (body && (readsBody(body) || carriesName(body, decoded))) found = true;
    if (!found) ts.forEachChild(node, check);
  };
  check(sourceFile);
  return found;
}

/** The helper's text as a tree, parents included, for the reads that need one walk to cross-reference. */
function parseBody(text: string): ts.SourceFile {
  return ts.createSourceFile("zod-fetch.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Reads the canonical beats out of a definition's source text. */
function collectBeats(text: string): Beats {
  const sourceFile = parseBody(text);
  const beats: Beats = {
    callsFetch: false,
    readsStatus: false,
    throwsStatusError: false,
    carriesFailureBody: throwsBody(sourceFile),
    parsesStreamBody: false,
    validatesWithSchema: false,
    handsBackBody: false,
  };
  const visit = (node: ts.Node): void => {
    if (callsFetch(node)) beats.callsFetch = true;
    if (branchesOnStatus(node)) beats.readsStatus = true;
    if (throwsStatusError(node)) beats.throwsStatusError = true;
    if (parsesStreamBody(node)) beats.parsesStreamBody = true;
    if (validatesWithSchema(node)) beats.validatesWithSchema = true;
    if (handsBackBody(node)) beats.handsBackBody = true;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return beats;
}

/** True for a declaration that declares, or wraps, a `zodFetch` declaration. */
function declaresHelper(node: ESTree.Node | null | undefined): boolean {
  if (!node) return false;
  if (node.type === "FunctionDeclaration") return isNamed(node.id, HELPER);
  if (node.type === "VariableDeclaration") return node.declarations.some(declaresHelper);
  if (node.type === "VariableDeclarator") {
    return isNamed(node.id.type === "Identifier" ? node.id : null, HELPER);
  }
  // Named exports only: a repository names its exports (see the Exports and Imports Rule),
  // so the helper is declared or exported under its own name.
  if (node.type === "ExportNamedDeclaration") return declaresHelper(node.declaration);
  return false;
}

/** Whether the file declares the helper at its top level, including under an export. */
function fileDeclaresHelper(program: ESTree.Program): boolean {
  return program.body.some(declaresHelper);
}

export const zodFetchHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require a repository to define a ${HELPER} helper that is the only caller of fetch, that carries the status and the body of an upstream failure on the error it throws, and that hands back a body a caller can relay.`,
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

    // A file that declares the helper owns the `fetch` calls in it; every other
    // file's requests have to reach the helper instead.
    let declares = false;

    const checkBeats = (reportNode: Rule.Node, body: string): void => {
      const beats = collectBeats(body);
      for (const beat of BEAT_KEYS) {
        if (beats[beat]) continue;
        context.report({
          node: reportNode,
          message: `${HELPER} ${BEAT_MESSAGES[beat]}. See ${DOC}`,
        });
      }

      // A violation rather than a missing beat: every part of the shape can be
      // present and the caller still be handed a body the helper has read.
      if (handsBackDecodedBody(body)) {
        context.report({
          node: reportNode,
          message: `${HELPER} ${DECODED_BODY_MESSAGE}. See ${DOC}`,
        });
      }
    };

    return {
      Program(node) {
        declares = fileDeclaresHelper(node);
      },
      FunctionDeclaration(node) {
        if (!isNamed(node.id, HELPER)) return;
        checkBeats(node, context.sourceCode.text.slice(node.range?.[0] ?? 0, node.range?.[1]));
      },
      VariableDeclarator(node) {
        const id = node.id.type === "Identifier" ? node.id : null;
        if (!isNamed(id, HELPER)) return;
        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") return;
        checkBeats(node, context.sourceCode.text.slice(init.range?.[0] ?? 0, init.range?.[1]));
      },
      CallExpression(node) {
        if (declares) return;
        if (node.callee.type !== "Identifier" || node.callee.name !== "fetch") return;
        context.report({
          node,
          message: `fetch must not be called outside the ${HELPER} helper. See ${DOC}`,
        });
      },
    };
  },
};
