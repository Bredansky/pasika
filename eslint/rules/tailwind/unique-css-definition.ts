/**
 * ESLint rule: pasika/unique-css-definition
 *
 * Shared project definitions MUST have one CSS file owner. Unlike selectors
 * and scoped overrides, these names are not intended to participate in the
 * CSS cascade across separate stylesheets.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

function ownershipKey(symbol: CssSymbol): string | undefined {
  if (symbol.kind === "root-variable" && symbol.scope !== "default") return undefined;
  return [symbol.kind, symbol.identity ?? symbol.name].join("|");
}

function symbolLabel(symbol: CssSymbol): string {
  switch (symbol.kind) {
    case "utility":
      return "Custom utility";
    case "theme-token":
      return "Theme token";
    case "root-variable":
      return "Default :root variable";
    case "keyframes":
      return "@keyframes";
    case "font-face":
      return "@font-face with matching descriptors for";
  }
}

export const uniqueCssDefinitionRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Reject duplicate project-level CSS definitions across stylesheets while preserving scoped overrides.",
    },
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
      includeReferences: false,
    });

    const owners = new Map<string, Set<string>>();
    for (const symbol of graph.definitions) {
      const key = ownershipKey(symbol);
      if (!key) continue;
      const files = owners.get(key) ?? new Set<string>();
      files.add(symbol.file);
      owners.set(key, files);
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const current = path.normalize(path.resolve(context.filename));
        const checked = new Set<string>();
        for (const symbol of graph.definitions) {
          if (symbol.file !== current) continue;
          const key = ownershipKey(symbol);
          if (!key || checked.has(key)) continue;
          checked.add(key);
          const files = owners.get(key);
          if (!files || files.size < 2) continue;
          const canonical = [...files].sort()[0];
          if (!canonical || canonical === current) continue;
          context.report({
            node,
            loc: {
              start: { line: symbol.line, column: 1 },
              end: { line: symbol.line, column: 2 },
            },
            message: `${symbolLabel(symbol)} "${symbol.name}" is also defined in ${path.relative(sourceRoot, canonical)}; define it in only one CSS file.`,
          });
        }
      },
    };
  },
};
