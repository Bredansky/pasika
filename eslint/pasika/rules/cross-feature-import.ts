/**
 * ESLint rule: pasika/cross-feature-import
 *
 * A component that imports from two or more feature folders MUST live in
 * src/compositions/.
 *
 * @see docs/code-organization-guide/rules/component-placement-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

const FEATURES_SEGMENT = "features";

function featureNameOf(resolvedPath: string, sourceRoot: string): string | undefined {
  const relative = path.relative(sourceRoot, resolvedPath);
  if (relative.startsWith("..")) return undefined;
  const segments = relative.split(path.sep);
  if (segments[0] !== FEATURES_SEGMENT || segments.length < 2) return undefined;
  return segments[1];
}

export const crossFeatureImportRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require non-composition files that import from two or more feature folders to live in src/compositions/.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};

    const sourceRoot = path.resolve("src");
    const fileRelative = path.relative(sourceRoot, filename);
    if (fileRelative.startsWith("..")) return {};

    const fileSegments = fileRelative.split(path.sep);
    const isInCompositions = fileSegments[0] === "compositions";
    const isInApp = fileSegments[0] === "app";
    const isConfig = fileSegments[0] === "config";
    if (isInCompositions || isInApp || isConfig) return {};

    const importedFeatures = new Set<string>();
    let alreadyReported = false;

    return {
      ImportDeclaration(node) {
        if (alreadyReported) return;
        const source = node.source;
        if (typeof source.value !== "string") return;

        let resolved: string | undefined;
        if (source.value.startsWith("@/")) {
          resolved = path.resolve(sourceRoot, source.value.slice(2));
        } else if (source.value.startsWith(".")) {
          resolved = path.resolve(path.dirname(filename), source.value);
        }
        if (!resolved) return;

        const feature = featureNameOf(resolved, sourceRoot);
        if (feature) importedFeatures.add(feature);

        if (importedFeatures.size >= 2) {
          alreadyReported = true;
          const names = [...importedFeatures].sort().join(", ");
          context.report({
            node,
            message:
              `This component imports from two or more feature folders (${names}) and must live in src/compositions/. ` +
              "See docs/code-organization-guide/rules/component-placement-rule.md",
          });
        }
      },
    };
  },
};
