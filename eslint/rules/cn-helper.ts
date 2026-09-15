/**
 * ESLint rule: pasika/cn-helper
 *
 * A file MUST import `cn` from `pasika/cn` and MUST NOT declare one of its
 * own, so every class merge in a repository is the one the framework maintains
 * rather than a copy that stops receiving its fixes. The rule reports a
 * declaration named `cn` wherever it sits — placement is the placement rules'
 * business, not this one's — and a binding of that name to any other source,
 * whether a package or another module of the repository.
 *
 * @see docs/pasika-adoption-guide/rules/cn-helper-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

const HELPER = "cn";
const ENTRY = "pasika/cn";
const DOC = "docs/pasika-adoption-guide/rules/cn-helper-rule.md";

const DECLARED = `A file must not declare its own ${HELPER}; import it from ${ENTRY}. See ${DOC}`;
const IMPORTED = `${HELPER} must be imported from ${ENTRY}. See ${DOC}`;

/** True for a node written as this identifier — a declaration's name, or a specifier's local binding. */
function isNamed(node: { type: string; name?: string } | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

export const cnHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require ${HELPER} to be imported from ${ENTRY} rather than declared in the repository.`,
    },
  },
  create(context) {
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
