/**
 * ESLint rule: pasika/unused-utility
 *
 * Require custom utilities to have a source-module or CSS @apply
 * reference, indexed by the shared CSS dependency graph.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import { statSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, cssSymbolUsages } from "./css-dependency-graph";
import { atrulesNamed, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

export const unusedUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require every custom @utility to be referenced by the repository's source.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
    } catch {
      return {};
    }

    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    const moduleFiles = findFiles(sourceRoot, MODULE_EXTENSIONS);
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: moduleFiles.map((file) => ({ path: file, content: textOf(file) })),
    });

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          if (!name) continue;

          if (cssSymbolUsages(graph, "utility", name).length > 0) continue;

          context.report({
            node: utility,
            message: `Custom utility "${name}" is never used by the repository's source; remove it or use it.`,
          });
        }
      },
    };
  },
};
