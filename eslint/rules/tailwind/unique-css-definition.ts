/**
 * ESLint rule: pasika/unique-css-definition
 *
 * Shared project definitions MUST have one canonical CSS definition throughout
 * the CSS tree, including within a single stylesheet. Selectors and scoped
 * overrides may intentionally participate in the cascade.
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
  // Repeated selectors may intentionally participate in the cascade.
  if (symbol.kind === "selector") return undefined;
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
    case "selector":
      return "CSS selector";
  }
}

export const uniqueCssDefinitionRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Reject duplicate CSS definitions both within and across stylesheets while preserving scoped overrides.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    if (cssFiles.length === 0) return {};
    const textOf = cachedTextReader();
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: [],
      includeReferences: false,
    });

    const groups = new Map<string, CssSymbol[]>();
    for (const symbol of graph.definitions) {
      const key = ownershipKey(symbol);
      if (!key) continue;
      const definitions = groups.get(key) ?? [];
      definitions.push(symbol);
      groups.set(key, definitions);
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const definitions of groups.values()) {
          if (definitions.length < 2) continue;
          definitions.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
          const canonical = definitions[0];
          if (!canonical) continue;
          for (const symbol of definitions.slice(1)) {
            if (symbol.file !== current) continue;
            const message =
              symbol.file === canonical.file
                ? `${symbolLabel(symbol)} "${symbol.name}" is defined more than once in this CSS file; define it only once.`
                : `${symbolLabel(symbol)} "${symbol.name}" is also defined in ${path.relative(sourceRoot, canonical.file)}; define it in only one CSS file.`;
            context.report({
              node,
              loc: {
                start: { line: symbol.line, column: 1 },
                end: { line: symbol.line, column: 2 },
              },
              message,
            });
          }
        }
      },
    };
  },
};
