/**
 * ESLint rule: pasika/stay-flat
 *
 * A component MUST stay flat until it has one or more exclusive child
 * components, then MUST be nested in a folder with the same name. An exclusive
 * child is a sibling component that only this component uses, so a flat
 * component that owns such children must move into a folder named after it.
 *
 * @see docs/next-codebase-guide/rules/folder-nesting-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import { segmentsOf } from "../project/ccf";
import { sourceRootOf } from "./project-root";

export const stayFlatRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a component with exclusive children to be nested in a folder with the same name.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    // A component file directly inside a feature folder: src/features/<feature>/<file>
    if (segments.length !== 3 || segments[0] !== "features") return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module?.exports.some((exp) => exp.kind === "component")) return {};

    const featureName = segments[1];
    if (!featureName) return {};

    // A sibling component file is an exclusive child when every file that
    // imports it is this component or a support file in the same feature folder.
    const exclusiveChildren = [...index.modules.values()].filter((candidate) => {
      if (candidate.file === file) return false;
      const candidateSegments = segmentsOf(candidate.file, sourceRoot);
      if (candidateSegments.length !== 3) return false;
      if (candidateSegments[0] !== "features" || candidateSegments[1] !== featureName) return false;
      if (candidateSegments[2]?.startsWith("index.")) return false;
      if (!candidate.exports.some((exp) => exp.kind === "component")) return false;

      const consumers = index.consumers.get(candidate.file) ?? new Set();
      if (consumers.size === 0) return false;
      return [...consumers].every((consumer) => {
        if (consumer === file) return true;
        const consumerSegments = segmentsOf(consumer, sourceRoot);
        if (consumerSegments[0] !== "features" || consumerSegments[1] !== featureName) return false;
        return !(index.modules.get(consumer)?.exports.some((exp) => exp.kind === "component") ?? false);
      });
    });

    if (exclusiveChildren.length === 0) return {};

    const childNames = exclusiveChildren
      .map((child) => child.exports.find((exp) => exp.kind === "component")?.name)
      .filter((name): name is string => name !== undefined);

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `This component has exclusive child component(s) ${childNames.join(", ")}; ` +
            `nest it in a folder named after it inside src/features/${featureName}/. ` +
            "See docs/next-codebase-guide/rules/folder-nesting-rule.md",
        });
      },
    };
  },
};
