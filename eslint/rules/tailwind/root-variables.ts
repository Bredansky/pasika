/**
 * ESLint rule: pasika/root-variables
 *
 * One canonical source for Tailwind design tokens:
 * - Define base values directly in @theme (never @theme inline).
 * - Override those same CSS variables under scoped/conditional theme selectors.
 * - Plain :root variables remain valid for non-theme values.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { atrulesNamed, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const INLINE_MESSAGE =
  "Define Tailwind tokens in @theme, never @theme inline; override the same token inside each theme scope.";
const INDIRECT_MESSAGE =
  "Define theme token values directly in @theme; theme variants must override the token in their own CSS scope.";

export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require direct @theme definitions and scoped theme overrides without inline or default :root duplication.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const stylesheets = findFiles(sourceRoot, CSS_EXTENSIONS);
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: [
        ...stylesheets
          .filter((file) => path.normalize(file) !== current)
          .map((file) => ({ path: file, content: textOf(file) })),
        { path: current, content: context.sourceCode.text },
      ],
      modules: [],
    });
    const names = new Set(
      graph.definitions.filter((symbol) => symbol.kind === "theme-token").map((symbol) => symbol.name),
    );

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          if (preludeIdentifiers(theme).includes("inline")) {
            context.report({ node: theme, message: INLINE_MESSAGE });
          }
          // The tolerant parser can carry theme declarations as Raw nodes.
          // Strip comments before checking for indirection in theme values.
          const source = context.sourceCode.getText(theme).replace(/\/\*[\s\S]*?\*\//gu, "");
          const indirect = /--[a-z][\w-]*\s*:\s*[^;{}]*\bvar\s*\(/u.test(source);
          if (indirect) context.report({ node: theme, message: INDIRECT_MESSAGE });
        }

        for (const symbol of graph.definitions) {
          if (symbol.kind !== "root-variable" || symbol.scope !== "default") continue;
          if (symbol.file !== current || !names.has(symbol.name)) continue;
          context.report({
            node,
            loc: {
              start: { line: symbol.line, column: 1 },
              end: { line: symbol.line, column: 2 },
            },
            message: `Theme token "${
              symbol.name
            }" already belongs to @theme; remove the unconditional :root redeclaration and use scoped theme overrides.`,
          });
        }
      },
    };
  },
};
