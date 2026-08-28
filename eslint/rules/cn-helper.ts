/**
 * ESLint rule: pasika/cn-helper
 *
 * The project's `cn` helper MUST merge clsx and tailwind-merge. This rule runs
 * on the module that defines `cn` and checks that its implementation uses both
 * `clsx` and `twMerge` (or tailwind-merge's default export).
 *
 * @see docs/framework-adoption-guide/rules/cn-helper-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

function isIdentifier(node: ESTree.Node | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

export const cnHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the cn helper to merge clsx and tailwind-merge.",
    },
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (isIdentifier(node.id, "cn")) checkBody(context, node.body);
      },
      VariableDeclarator(node) {
        if (node.init?.type === "ArrowFunctionExpression" && isIdentifier(node.id, "cn")) {
          checkBody(context, node.init.body);
        }
      },
    };
  },
};

function checkBody(context: Rule.RuleContext, body: ESTree.Node): void {
  const source = context.sourceCode.getText(body);
  const usesClsx = /\bclsx\b/.test(source);
  const usesTwMerge = /\btwMerge\b|\btailwind-merge\b/.test(source);
  if (!usesClsx || !usesTwMerge) {
    context.report({
      node: body,
      message: "cn must be built from clsx and tailwind-merge (e.g. cn = twMerge(clsx(inputs))).",
    });
  }
}