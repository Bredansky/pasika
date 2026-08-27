/**
 * @fileoverview Rules, references, and policy must not link to other documents.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Link } from "mdast";
import { getFilename } from "./helpers.js";

/** The document kind for a filename, when the no-link rule applies to it. */
function linkedKind(filename: string): string | undefined {
  if (filename.endsWith("-rule.md")) return "rule";
  if (filename.endsWith("-reference.md")) return "reference";
  if (filename.endsWith("-policy.md")) return "policy";
  return undefined;
}

export const noCrossDocumentLinkRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Rules, references, and policy must not link to other documents.",
      recommended: true,
    },
  },
  create(context) {
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
