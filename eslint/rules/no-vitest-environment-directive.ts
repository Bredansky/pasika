/**
 * ESLint rule: pasika/no-vitest-environment-directive
 *
 * A browser-dependent test opts into the jsdom Vitest project by using the
 * .dom.test.tsx or .dom.spec.tsx filename convention, not an inline pragma.
 *
 * @see docs/pasika-adoption-guide/rules/vitest-coverage-rule.md
 */
import type { Rule } from "eslint";

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

export const noVitestEnvironmentDirectiveRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Select Vitest environments through named projects and filename conventions, not file directives.",
    },
  },
  create(context) {
    if (!TEST_FILE.test(context.filename)) return {};

    return {
      Program(node) {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!/@vitest-environment(?:\s|$)/.test(comment.value)) continue;
          context.report({
            node,
            loc: comment.loc?.start ?? { line: 1, column: 0 },
            message:
              "Use the .dom.test.tsx/.dom.spec.tsx filename convention and the jsdom Vitest project instead of @vitest-environment directives.",
          });
        }
      },
    };
  },
};
