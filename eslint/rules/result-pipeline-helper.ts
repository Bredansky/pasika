/**
 * ESLint rule: pasika/result-pipeline-helper
 *
 * The project's Result-pipeline helpers MUST match their canonical shape:
 * `ok`/`err` build a `{ ok, value }`/`{ ok, error }` outcome, `andThen` only
 * runs its next step once the previous outcome's `ok` is true, `HttpError`
 * extends `Error` and carries a `status`, and `respond` branches on
 * `ok` and resolves through `NextResponse.json`. This rule runs on whichever
 * module defines each helper and checks its implementation against that
 * shape, the same way cn-helper checks the project's `cn` helper.
 *
 * @see docs/next-codebase-guide/rules/result-pipeline-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

function isIdentifier(node: ESTree.Node | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

interface HelperCheck {
  patterns: RegExp[];
  message: string;
}

const FUNCTION_CHECKS: Record<string, HelperCheck> = {
  ok: {
    patterns: [/\bok\s*:\s*true\b/, /\bvalue\b/],
    message: "ok must return { ok: true, value }.",
  },
  err: {
    patterns: [/\bok\s*:\s*false\b/, /\berror\b/],
    message: "err must return { ok: false, error }.",
  },
  andThen: {
    patterns: [/\.ok\b/],
    message: "andThen must branch on the previous step's .ok before running its next step.",
  },
  respond: {
    patterns: [/\.ok\b/, /NextResponse\.json\(/],
    message: "respond must branch on .ok and resolve through NextResponse.json.",
  },
};

const DOC_LINK = "See docs/next-codebase-guide/rules/result-pipeline-rule.md";

export const resultPipelineHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the Result-pipeline helpers to match their canonical shape.",
    },
  },
  create(context) {
    function checkFunction(name: string, node: Rule.Node, body: ESTree.Node): void {
      const check = FUNCTION_CHECKS[name];
      if (!check) return;
      const source = context.sourceCode.getText(body);
      if (check.patterns.some((pattern) => !pattern.test(source))) {
        context.report({ node, message: `${check.message} ${DOC_LINK}` });
      }
    }

    return {
      FunctionDeclaration(node) {
        const name = node.id.name;
        if (FUNCTION_CHECKS[name]) checkFunction(name, node, node.body);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (
          FUNCTION_CHECKS[name] &&
          (node.init?.type === "ArrowFunctionExpression" || node.init?.type === "FunctionExpression")
        ) {
          checkFunction(name, node, node.init.body);
        }
      },

      ClassDeclaration(node) {
        if (!isIdentifier(node.id, "HttpError")) return;
        const extendsError = node.superClass?.type === "Identifier" && node.superClass.name === "Error";
        const hasStatus = /\bstatus\b/.test(context.sourceCode.getText(node.body));
        if (!extendsError || !hasStatus) {
          context.report({
            node,
            message: `HttpError must extend Error and carry a status. ${DOC_LINK}`,
          });
        }
      },
    };
  },
};
