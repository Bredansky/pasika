/**
 * @fileoverview Rules and references must live in the matching subfolder of a
 * guide folder that has its entry point.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Root } from "mdast";
import { getFilename } from "./helpers";

type SupportDocumentKind = "reference" | "rule";

function checkPlacement(filename: string, kind: SupportDocumentKind): string | undefined {
  const parentFolder = path.basename(path.dirname(filename));
  const expectedParent = `${kind}s`;

  if (parentFolder !== expectedParent) {
    return `${kind} lives in "${parentFolder}/" instead of "${expectedParent}/"`;
  }

  const guideFolderPath = path.dirname(path.dirname(filename));
  const guideFolder = path.basename(guideFolderPath);
  if (!guideFolder.endsWith("-guide")) {
    return `${kind} owner folder "${guideFolder}/" does not use the "*-guide/" suffix`;
  }

  const entryPoint = `${guideFolder}.md`;
  if (!existsSync(path.join(guideFolderPath, entryPoint))) {
    return `${kind} owner folder "${guideFolder}/" has no "${entryPoint}" entry point`;
  }

  return undefined;
}

export const supportDocumentPlacementRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Rules and references must belong to a guide with a matching entry point.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith(".md")) return;

        let kind: SupportDocumentKind | undefined;
        if (filename.endsWith("-rule.md")) kind = "rule";
        if (filename.endsWith("-reference.md")) kind = "reference";
        if (!kind) return;

        const message = checkPlacement(filename, kind);
        if (message) {
          context.report({
            node,
            message,
          });
        }
      },
    };
  },
};
