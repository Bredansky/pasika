/**
 * ESLint rule: pasika/support-file-placement
 *
 * Enforces where a hook, type, schema, constant, or utility lives, which depends
 * on the files that import it and so cannot be decided from one file.
 *
 * @see docs/code-organization-guide/rules/types-and-schemas-rule.md
 * @see docs/code-organization-guide/rules/constants-rule.md
 * @see docs/code-organization-guide/rules/utilities-rule.md
 * @see docs/code-organization-guide/rules/hook-extraction-rule.md
 * @see docs/code-organization-guide/rules/configuration-rule.md
 * @see docs/code-organization-guide/rules/folder-nesting-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index.js";
import {
  describeConsumers,
  folderSegmentsOf,
  formatFolder,
  resolveSupportPlacement,
  SUPPORT_FOLDERS,
} from "../project/ccf.js";

const REASON_TEXT: Record<string, string> = {
  "app-consumer": "a file under src/app/ imports it, so it belongs to the app-wide support folder",
  "config-module": "every file that imports it belongs to that configuration module",
  ccf: "that is the closest folder its consumers share",
  "across-features": "its consumers span more than one feature, so no feature can own it",
  "across-layers": "its consumers span more than one layer, so no layer can own it",
};

const sameFolder = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((segment, depth) => segment === right[depth]);

export const supportFilePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce that a support file lives in the folder its consumers imply.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const supportFile = path.resolve(context.filename);
    const currentFolder = folderSegmentsOf(supportFile, sourceRoot);
    const supportFolder = currentFolder[currentFolder.length - 1];

    // Only a file already inside a support folder is placed by this rule; a
    // declaration still sitting beside its consumer is an extraction question.
    if (supportFolder === undefined || !SUPPORT_FOLDERS.has(supportFolder)) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const placement = resolveSupportPlacement(supportFile, supportFolder, index);
    if (!placement || sameFolder(currentFolder, placement.expectedFolder)) return {};

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Move this file to ${formatFolder(placement.expectedFolder)} — ` +
            `${REASON_TEXT[placement.reason] ?? "that is where its consumers place it"}. ` +
            `Imported by ${describeConsumers(placement.countedConsumers, sourceRoot)}.`,
        });
      },
    };
  },
};
