/**
 * ESLint rule: pasika/hook-extraction
 *
 * A custom hook MUST be extracted to its own file when two or more consumers
 * use it. The file must be read across the tree, because how many files import
 * a hook is not visible from one file.
 *
 * @see docs/next-codebase-guide/rules/hook-extraction-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, symbolKey } from "../project/index";
import { folderSegmentsOf, segmentsOf } from "../project/ccf";
import { sourceRootOf } from "./project-root";

export const hookExtractionRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a custom hook with two or more consumers to live in its own hooks/ file.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module) return {};

    const folder = folderSegmentsOf(file, sourceRoot);
    const alreadyInHooksFolder = folder.length > 0 && folder[folder.length - 1] === "hooks";

    const reusedHooks = module.exports
      .filter((exp) => exp.kind === "hook" && !alreadyInHooksFolder)
      .map((exp) => ({ exp, consumers: index.symbolConsumers.get(symbolKey(file, exp.name)) }))
      .filter(({ consumers }) => (consumers?.size ?? 0) >= 2);

    if (reusedHooks.length === 0) return {};

    return {
      Program(node) {
        for (const { exp, consumers } of reusedHooks) {
          context.report({
            node,
            loc: { line: exp.line, column: 0 },
            message:
              `Hook "${exp.name}" has ${String(consumers?.size ?? 0)} consumers; ` +
              "extract it to its own file in a hooks/ folder. " +
              "See docs/next-codebase-guide/rules/hook-extraction-rule.md",
          });
        }
      },
    };
  },
};
