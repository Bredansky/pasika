/**
 * ESLint rule: pasika/unique-utility-definition
 *
 * A named Tailwind @utility has one owner across the src CSS tree.
 * Cross-file duplicates are reported on the noncanonical definition.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { atrulesNamed, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

export const uniqueUtilityDefinitionRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require custom utility names to be defined in one project stylesheet." },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    if (cssFiles.length === 0) return {};
    const textOf = cachedTextReader();
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({ path: file, content: textOf(file) })),
      modules: [],
    });
    const owners = new Map<string, Set<string>>();
    for (const symbol of graph.definitions) {
      if (symbol.kind !== "utility") continue;
      const files = owners.get(symbol.name) ?? new Set<string>();
      files.add(symbol.file);
      owners.set(symbol.name, files);
    }
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const current = path.normalize(path.resolve(context.filename));
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          if (!name) continue;
          const files = owners.get(name);
          if (!files || files.size < 2) continue;
          const canonical = [...files].sort()[0];
          if (!canonical || current === canonical) continue;
          context.report({
            node: utility,
            message: `Custom utility "${name}" is also defined in ${path.relative(sourceRoot, canonical)}; define it in only one CSS file.`,
          });
        }
      },
    };
  },
};
