/**
 * ESLint rule: pasika/cn-helper
 *
 * A repository MUST define a `cn` helper, and that helper MUST return
 * twMerge(clsx(...)). The shape half runs on every module that declares a
 * function named `cn`, wherever it sits, and checks the expression it returns
 * — placement is the placement rules' business, not this one's. The existence
 * half runs on the repository's eslint config file, the one module every
 * repository has at its root, and asks the project index whether any module
 * under src/ exports `cn`.
 *
 * @see docs/pasika-adoption-guide/rules/cn-helper-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { getProjectIndex } from "../project/index";

const HELPER = "cn";
const DOC = "docs/pasika-adoption-guide/rules/cn-helper-rule.md";
const ESLINT_CONFIG = /^eslint\.config\.(?:cjs|cts|js|mjs|mts|ts)$/;

function isNamed(node: ESTree.Identifier | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

function isCallTo(node: ESTree.Node | undefined, callee: string): node is ESTree.CallExpression {
  return node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === callee;
}

/** True when the expression is the canonical composition, `twMerge(clsx(...))`. */
function isComposition(node: ESTree.Node | undefined): boolean {
  if (!isCallTo(node, "twMerge")) return false;
  const first = node.arguments[0];
  return first !== undefined && first.type !== "SpreadElement" && isCallTo(first, "clsx");
}

/** The expression a function hands back, whether its body is a block or an expression. */
function returnedExpression(body: ESTree.Node | undefined): ESTree.Node | undefined {
  if (!body) return undefined;
  if (body.type !== "BlockStatement") return body;
  for (const statement of body.body) {
    if (statement.type === "ReturnStatement") return statement.argument ?? undefined;
  }
  return undefined;
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

export const cnHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require a repository to define a ${HELPER} helper that returns twMerge(clsx(...)).`,
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

    const check = (body: ESTree.Node | undefined, reportNode: Rule.Node): void => {
      if (isComposition(returnedExpression(body))) return;
      context.report({
        node: reportNode,
        message: `${HELPER} must return twMerge(clsx(...)). See ${DOC}`,
      });
    };

    return {
      FunctionDeclaration(node) {
        if (isNamed(node.id, HELPER)) check(node.body, node);
      },
      VariableDeclarator(node) {
        if (!isNamed(node.id.type === "Identifier" ? node.id : null, HELPER)) return;
        const init = node.init;
        if (init?.type !== "ArrowFunctionExpression" && init?.type !== "FunctionExpression") return;
        check(init.body, node);
      },
    };
  },
};
