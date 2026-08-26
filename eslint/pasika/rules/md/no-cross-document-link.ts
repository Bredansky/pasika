/**
 * @fileoverview Rules, references, and policy must not link to other documents.
 */
import type { Rule } from "eslint";
import type { Link } from "mdast";
import { getFilename } from "./helpers.js";

/** The document kind for a filename, when the no-link rule applies to it. */
function linkedKind(filename: string): string | undefined {
  if (filename.endsWith("-rule.md")) return "rule";
  if (filename.endsWith("-reference.md")) return "reference";
  if (filename.endsWith("-policy.md")) return "policy";
  return undefined;
}

export const noCrossDocumentLinkRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Rules, references, and policy must not link to other documents.",
      recommended: true,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      link(node: Link) {
        const filename = getFilename(context);
        const kind = linkedKind(filename);
        if (!kind) return;

        if (node.url.endsWith(".md")) {
          context.report({
            node,
            message: `${kind} links another document: ${node.url}`,
          });
        }
      },
    };
  },
};
