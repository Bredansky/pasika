/**
 * ESLint rule: pasika/cross-feature-import
 *
 * A component that imports from two or more feature folders other than the one
 * it lives in MUST live in src/compositions/. The folder a file already lives
 * in is not a feature it combines, so it never counts toward the two — a
 * component importing its own feature's support folders stays where it is.
 *
 * @see docs/next-codebase-guide/rules/component-placement-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { sourceRootOf } from "./project-root";

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
        "Require non-composition files that import from two or more feature folders other than their own to live in src/compositions/.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};

    const sourceRoot = sourceRootOf(context);
    const fileRelative = path.relative(sourceRoot, filename);
    if (fileRelative.startsWith("..")) return {};

    const fileSegments = fileRelative.split(path.sep);
    const isInCompositions = fileSegments[0] === "compositions";
    const isInApp = fileSegments[0] === "app";
    const isConfig = fileSegments[0] === "config";
    if (isInCompositions || isInApp || isConfig) return {};

    // The feature the file already lives in. Importing from it is not importing
    // from a feature folder the component combines, so it cannot count: a file's
    // own folder is never a reason for the file to live somewhere else.
    const ownFeature = fileSegments[0] === FEATURES_SEGMENT ? fileSegments[1] : undefined;

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
        if (feature !== undefined && feature !== ownFeature) importedFeatures.add(feature);

        if (importedFeatures.size >= 2) {
          alreadyReported = true;
          const names = [...importedFeatures].sort().join(", ");
          context.report({
            node,
            message:
              `This component imports from two or more feature folders (${names}) and must live in src/compositions/. ` +
              "See docs/next-codebase-guide/rules/component-placement-rule.md",
          });
        }
      },
    };
  },
};
