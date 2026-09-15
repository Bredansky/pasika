/**
 * ESLint rule: pasika/zod-fetch-helper
 *
 * Every outbound request in a repository MUST go through the `zodFetch`
 * imported from `pasika/zod-fetch`: the helper is the one module that calls
 * `fetch`, so a `fetch` call anywhere else is a request that skipped the status
 * check, the schema validation, and the failure the helper carries. The rule
 * reports a `fetch` call — written bare or on a global object — wherever it
 * sits, and a binding of the helper's name to anything but the package entry,
 * whether a declaration or an import from another source. Placement is the
 * placement rules' business, not this one's.
 *
 * @see docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

const HELPER = "zodFetch";
const ENTRY = "pasika/zod-fetch";
const DOC = "docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";

const FETCHED = `fetch must not be called; make the request through ${HELPER} from ${ENTRY}. See ${DOC}`;
const DECLARED = `A module must not declare its own ${HELPER}; import it from ${ENTRY}. See ${DOC}`;
const IMPORTED = `${HELPER} must be imported from ${ENTRY}. See ${DOC}`;

/** The objects a bare `fetch` resolves through, so `globalThis.fetch(...)` is the same request. */
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self", "global"]);

function isNamed(node: ESTree.Node | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

/** True for a callee that reaches the global `fetch` — `fetch(...)` or `globalThis.fetch(...)`. */
function callsFetch(callee: ESTree.Node): boolean {
  if (isNamed(callee, "fetch")) return true;
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    isNamed(callee.property, "fetch") &&
    callee.object.type === "Identifier" &&
    GLOBAL_OBJECTS.has(callee.object.name)
  );
}

export const zodFetchHelperRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: `Require every request to go through the ${HELPER} imported from ${ENTRY}, the only caller of fetch.`,
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
      CallExpression(node) {
        if (!callsFetch(node.callee)) return;
        context.report({ node, message: FETCHED });
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
