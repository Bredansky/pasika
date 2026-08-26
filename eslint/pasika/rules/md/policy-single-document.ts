/**
 * @fileoverview A repository must not have more than one Policy document.
 */
import type { Rule } from "eslint";
import type { Root } from "mdast";
import { getFilename } from "./helpers.js";
import { findDocsRoot, getProjectDocs } from "./project-index.js";

export const policySingleDocumentRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "A repository must not have more than one Policy document.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-policy.md")) return;

        const docsRoot = findDocsRoot(filename);
        if (!docsRoot) return;

        const docs = getProjectDocs(docsRoot);
        const policyDocs = docs.filter((d) => d.kind === "policy");
        if (policyDocs.length > 1) {
          // Only report on the first policy doc, so the issue is reported once.
          if (policyDocs[0]?.filePath === filename) {
            context.report({
              node,
              message: `${String(policyDocs.length)} policy documents exist`,
            });
          }
        }
      },
    };
  },
};
