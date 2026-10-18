/**
 * ESLint rule: pasika/with-response-helper
 *
 * The `withResponse` a route handler is wrapped in MUST be imported from
 * `pasika/with-response`, and a repository MUST NOT declare one of its own, so
 * every route answers through the wrapper the framework's rules describe. The
 * rule reports a declaration named `withResponse` wherever it sits — placement
 * is the placement rules' business, not this one's — and a binding of that name
 * to any other source, whether a package or another module of the repository.
 *
 * @see docs/pasika-adoption-guide/rules/with-response-helper-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

const HELPER = "withResponse";
const ENTRY = "pasika/with-response";
const DOC = "docs/pasika-adoption-guide/rules/with-response-helper-rule.md";

const DECLARED = `A repository must not declare its own ${HELPER}; import it from ${ENTRY}. See ${DOC}`;
const IMPORTED = `${HELPER} must be imported from ${ENTRY}. See ${DOC}`;
const INLINE = `Pass a named handler to ${HELPER} instead of an inline callback. See ${DOC}`;

/** True for a node written as this identifier — a declaration's name, or a specifier's local binding. */
function isNamed(node: { type: string; name?: string } | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

/** Detect direct and TS-cast inline callbacks without trusting unknown AST shapes. */
function isInlineCallback(node: unknown): boolean {
  if (typeof node !== "object" || node === null || !("type" in node)) return false;
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") return true;
  if (
    (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression" || node.type === "TSNonNullExpression") &&
    "expression" in node
  ) {
    return isInlineCallback(node.expression);
  }
  return false;
}

export const withResponseHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require ${HELPER} from ${ENTRY} and reject inline handler callbacks.`,
    },
  },
  create(context) {
    const wrapperNames = new Set([HELPER]);
    /**
     * The names an import or a re-export binds, so a binding of the helper's
     * name to a source that is not the package entry is reported at the
     * specifier it was written as.
     */
    const checkSource = (node: ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration): void => {
      if (!node.source || node.source.value === ENTRY) return;
      for (const specifier of node.specifiers) {
        if (!isNamed(specifier.local, HELPER)) continue;
        context.report({ node: specifier, message: IMPORTED });
      }
    };

    return {
      Program(node) {
        for (const statement of node.body) {
          if (statement.type !== "ImportDeclaration" || statement.source.value !== ENTRY) continue;
          for (const specifier of statement.specifiers) {
            if (specifier.type === "ImportSpecifier" && isNamed(specifier.imported, HELPER)) {
              wrapperNames.add(specifier.local.name);
            }
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !wrapperNames.has(node.callee.name)) return;
        const handler = node.arguments[node.arguments.length - 1];
        if (isInlineCallback(handler)) context.report({ node, message: INLINE });
      },
      FunctionDeclaration(node) {
        if (isNamed(node.id, HELPER)) context.report({ node, message: DECLARED });
      },
      VariableDeclarator(node) {
        if (isNamed(node.id.type === "Identifier" ? node.id : null, HELPER)) {
          context.report({ node, message: DECLARED });
        }
      },
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
    };
  },
};
