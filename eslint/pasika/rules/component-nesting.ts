/**
 * ESLint rule: pasika/component-nesting
 *
 * A component MUST NOT be nested only because it has support files. Nesting is
 * justified by exclusive child components, so a nested component folder whose
 * only contents are the component, its index, and support folders must be
 * flattened.
 *
 * @see docs/code-organization-guide/rules/folder-nesting-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import { segmentsOf } from "../project/ccf";

export const componentNestingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a nested component to have exclusive child components, not only support files.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    // A component file directly inside a feature subfolder:
    // src/features/<feature>/<folder>/<file>
    if (segments.length !== 4 || segments[0] !== "features") return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module?.exports.some((exp) => exp.kind === "component")) return {};

    const folder = segments.slice(0, 3);

    // Another component file in the same folder is an exclusive child and makes
    // the nesting real; an index barrel does not count.
    const hasChildComponent = [...index.modules.values()].some((candidate) => {
      if (candidate.file === file) return false;
      const candidateSegments = segmentsOf(candidate.file, sourceRoot);
      if (candidateSegments.length !== 4) return false;
      if (
        candidateSegments[0] !== folder[0] ||
        candidateSegments[1] !== folder[1] ||
        candidateSegments[2] !== folder[2]
      ) {
        return false;
      }
      if (candidateSegments[3]?.startsWith("index.")) return false;
      return candidate.exports.some((exp) => exp.kind === "component");
    });

    if (hasChildComponent) return {};

    const flatFolder = segments.slice(0, 2).join("/");

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `This component is nested in src/${folder.join("/")}/ but its folder has no exclusive ` +
            `child components — only support files. Flatten it back into src/${flatFolder}/. ` +
            "See docs/code-organization-guide/rules/folder-nesting-rule.md",
        });
      },
    };
  },
};
