/**
 * ESLint rule: pasika/repeated-numeric-value
 *
 * A raw numeric value MUST NOT be repeated under the same semantic slot across
 * production files. Exact names form a semantic slot; common rendering
 * measurements/timing additionally normalize `compositionWidth`, `baseWidth`,
 * object/JSX `width` (and corresponding height/fps/duration names) together.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import type { NamedNumericLiteral } from "../project/parse-module";
import { sourceRootOf } from "./project-root";

const ignoredValues = new Set([-1, 0, 1]);

function isNonProductionFile(file: string, sourceRoot: string): boolean {
  const relative = path.relative(sourceRoot, file);
  const segments = relative.split(path.sep);
  const basename = path.basename(file);

  return (
    /\.(?:test|spec|mock)\.[^.]+$/.test(basename) ||
    segments.some((segment) => segment === "__tests__" || segment === "__mocks__" || segment === "mocks")
  );
}

function isCanonicalConstantFile(file: string, sourceRoot: string): boolean {
  const segments = path.relative(sourceRoot, file).split(path.sep);
  return segments.includes("constants") || segments[0] === "config";
}

function groupKey(literal: NamedNumericLiteral): string {
  return `${literal.semanticName}\u0000${String(literal.value)}`;
}

export const repeatedNumericValueRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require repeated named numeric values across production files to use one extracted constant or enum.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (isNonProductionFile(file, sourceRoot) || isCanonicalConstantFile(file, sourceRoot)) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const currentModule = index.modules.get(file);
    if (!currentModule) return {};

    const filesByGroup = new Map<string, Set<string>>();
    for (const [moduleFile, parsedModule] of index.modules) {
      if (isNonProductionFile(moduleFile, sourceRoot)) continue;

      for (const literal of parsedModule.namedNumericLiterals) {
        if (ignoredValues.has(literal.value)) continue;
        const key = groupKey(literal);
        const files = filesByGroup.get(key) ?? new Set<string>();
        files.add(moduleFile);
        filesByGroup.set(key, files);
      }
    }

    return {
      Program(node) {
        const reported = new Set<string>();

        for (const literal of currentModule.namedNumericLiterals) {
          if (ignoredValues.has(literal.value)) continue;

          const key = groupKey(literal);
          if (reported.has(key)) continue;

          const files = filesByGroup.get(key);
          if (!files || files.size < 2) continue;

          reported.add(key);
          context.report({
            node,
            loc: { line: literal.line, column: 0 },
            message:
              `The numeric value ${String(literal.value)} is repeated for the "${literal.semanticName}" semantic slot ` +
              `in ${String(files.size)} production files. Extract one constant or enum at their CCF and import it instead. ` +
              "See docs/next-codebase-guide/rules/constants-rule.md",
          });
        }
      },
    };
  },
};
