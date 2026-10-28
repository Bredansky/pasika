/**
 * ESLint rule: pasika/unique-css-token-value
 *
 * Distinct design tokens MUST NOT share a static CSS value, even if their
 * names or stylesheet files differ. Conditional overrides are not defaults.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

/** Normalize only provably equivalent syntax, not dynamic var()/calc() values. */
function valueIdentity(value: string): string {
  const text = value.trim();
  const hex = /^#(?<digits>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(text)?.groups?.digits;
  if (!hex) return text;
  const lower = hex.toLowerCase();
  const full = lower.length <= 4 ? Array.from(lower, (digit) => digit + digit).join("") : lower;
  return `#${full.length === 8 && full.endsWith("ff") ? full.slice(0, -2) : full}`;
}

function isComparable(symbol: CssSymbol): boolean {
  if (symbol.value === undefined || symbol.value.trim() === "") return false;
  return symbol.kind === "theme-token" || (symbol.kind === "root-variable" && symbol.scope === "default");
}

function compareLocations(left: CssSymbol, right: CssSymbol): number {
  const file = left.file.localeCompare(right.file);
  return file || left.line - right.line;
}

export const uniqueCssTokenValueRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Reject distinct CSS design tokens with duplicate static values across the project.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: [],
      includeReferences: false,
    });

    const byValue = new Map<string, CssSymbol[]>();
    for (const definition of graph.definitions) {
      if (!isComparable(definition)) continue;
      const value = valueIdentity(definition.value ?? "");
      const group = byValue.get(value) ?? [];
      group.push(definition);
      byValue.set(value, group);
    }

    const redundant = new Map<CssSymbol, CssSymbol>();
    for (const group of byValue.values()) {
      group.sort(compareLocations);
      const first = group[0];
      if (!first) continue;
      for (const definition of group.slice(1)) {
        // The name-uniqueness checks report same-name collisions separately.
        if (definition.name !== first.name) redundant.set(definition, first);
      }
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const [definition, original] of redundant) {
          if (definition.file !== current) continue;
          context.report({
            node,
            loc: {
              start: { line: definition.line, column: 1 },
              end: { line: definition.line, column: 2 },
            },
            message: `Token "${definition.name}" duplicates the value of "${original.name}" in ${path.relative(
              sourceRoot,
              original.file,
            )}:${String(original.line)}; reuse one design token.`,
          });
        }
      },
    };
  },
};
