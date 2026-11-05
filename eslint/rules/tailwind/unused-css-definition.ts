/**
 * ESLint rule: pasika/unused-css-definition
 *
 * Find unused @utility declarations, @keyframes and Tailwind theme tokens
 * through one project-wide CSS and source-module dependency graph.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import { statSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, escapeRegExp, findFiles } from "./source-files";

// These are Tailwind defaults or design-system primitives that can be used
// implicitly by generated CSS, rather than through a named class in source.
function isImplicitThemeToken(name: string): boolean {
  return (
    name === "--spacing" ||
    name === "--radius" ||
    name === "--font-sans" ||
    name === "--font-mono" ||
    name.startsWith("--breakpoint-") ||
    name.startsWith("--default-")
  );
}

function staticMention(content: string, name: string): boolean {
  const pattern = new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, "u");
  return pattern.test(content);
}

function isUnused(
  symbol: CssSymbol,
  references: ReturnType<typeof buildCssDependencyGraph>["references"],
  moduleContents: string[],
): boolean {
  if (symbol.kind === "utility") {
    return !references.some((reference) => reference.kind === "utility" && reference.name === symbol.name);
  }
  if (symbol.kind === "keyframes") {
    return !references.some((reference) => reference.kind === "keyframes" && reference.name === symbol.name);
  }
  if (symbol.kind !== "theme-token" || isImplicitThemeToken(symbol.name)) return false;

  if (references.some((reference) => reference.kind === "theme-class" && reference.token === symbol.name)) {
    return false;
  }
  if (references.some((reference) => reference.kind === "variable" && reference.name === symbol.name)) {
    return false;
  }
  // Includes JS consumers reading variables through getComputedStyle(),
  // which don't appear as var(...) or generated Tailwind classes.
  return !moduleContents.some((content) => staticMention(content, symbol.name));
}

function unusedMessage(symbol: CssSymbol): string {
  if (symbol.kind === "utility") {
    return `Custom utility "${symbol.name}" is never referenced by project CSS or source.`;
  }
  if (symbol.kind === "keyframes") {
    return `@keyframes "${symbol.name}" is never referenced by project CSS or source.`;
  }
  return `Theme token "${symbol.name}" is never referenced by project CSS or source.`;
}

export const unusedCssDefinitionRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Report unused @utility, @keyframes and non-foundational @theme tokens across project CSS and modules.",
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
    const moduleContents = findFiles(sourceRoot, MODULE_EXTENSIONS).map((file) => ({
      path: file,
      content: textOf(file),
    }));
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: moduleContents,
    });
    const sourceTexts = moduleContents.map((module) => module.content);
    const unused = graph.definitions.filter(
      (symbol) => symbol.file === current && isUnused(symbol, graph.references, sourceTexts),
    );

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const symbol of unused) {
          context.report({
            node,
            loc: {
              start: { line: symbol.line, column: 1 },
              end: { line: symbol.line, column: 2 },
            },
            message: unusedMessage(symbol),
          });
        }
      },
    };
  },
};
