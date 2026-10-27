/**
 * ESLint rule: pasika/root-variables
 *
 * Direct tokens use @theme; tokens using var() use @theme inline.
 * Each referenced runtime variable has the token's exact name and a default
 * :root declaration. Its value may be overridden in scoped selectors.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const INLINE_MESSAGE = "Define design tokens with direct values in @theme, not @theme inline.";
const INDIRECT_MESSAGE = "Define design tokens that reference CSS variables via var() in @theme inline.";

export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require @theme for fixed tokens, matching :root variables for @theme inline tokens, and no other token redeclarations.",
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
      includeReferences: false,
    });
    const names = new Set(
      graph.definitions.filter((symbol) => symbol.kind === "theme-token").map((symbol) => symbol.name),
    );
    // Collect all theme names, including one-line blocks the tolerant parser
    // may truncate. Inline tokens backed by identically named variables may
    // be overridden at runtime regardless of their Tailwind namespace.
    const mirroredTokens = new Set<string>();
    for (const file of [...stylesheets.filter((candidate) => path.normalize(candidate) !== current), current]) {
      const source = (path.normalize(file) === current ? context.sourceCode.text : textOf(file)).replace(
        /\/\*[\s\S]*?\*\//gu,
        " ",
      );
      for (const theme of source.matchAll(/@theme(?<options>(?:\s+[\w-]+)*)\s*\{(?<body>[^{}]*)\}/gu)) {
        const inline = /\binline\b/u.test(theme.groups?.options ?? "");
        for (const declaration of (theme.groups?.body ?? "").matchAll(
          /(?:^|;)\s*(?<name>--[a-z][\w-]*)\s*:\s*(?<value>[^;]*)/gu,
        )) {
          const { name, value } = declaration.groups ?? {};
          if (!name) continue;
          names.add(name);
          if (inline && /\bvar\s*\(/u.test(value ?? "")) {
            mirroredTokens.add(name);
          }
        }
      }
    }
    const defaultRootNames = new Set(
      graph.definitions
        .filter((symbol) => symbol.kind === "root-variable" && symbol.scope === "default")
        .map((symbol) => symbol.name),
    );

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const theme of atrulesNamed(node, "theme")) {
          const inline = preludeIdentifiers(theme).includes("inline");
          // Tailwind's theme declarations can be Raw nodes in the tolerant CSS
          // parser. Inspect each declaration separately, including multiline
          // values and declarations without a final semicolon.
          const source = context.sourceCode
            .getText(theme)
            .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\r\n]/gu, " "));
          for (const match of source.matchAll(
            /(?:^|[{;\r\n])\s*(?<name>--[a-z][\w-]*)\s*:\s*(?<value>[^;{}]*)(?=;|[}])/gu,
          )) {
            const { name, value } = match.groups ?? {};
            if (!name || value === undefined) continue;
            // A quoted literal containing "var(" isn't a variable reference.
            const unquoted = value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu, "");
            const referencesVariable = /\bvar\s*\(/iu.test(unquoted);
            if (inline && referencesVariable) {
              for (const reference of unquoted.matchAll(/\bvar\(\s*(?<variable>--[\w-]+)/gu)) {
                const runtime = reference.groups?.variable;
                if (runtime && runtime !== name) {
                  context.report({
                    node: theme,
                    message: `Tailwind token "${name}" must reference its same-named CSS variable, not "${runtime}".`,
                  });
                } else if (runtime && !defaultRootNames.has(runtime)) {
                  context.report({
                    node: theme,
                    message: `Tailwind token "${name}" references "${runtime}" without a default :root declaration.`,
                  });
                }
              }
            }
            if (inline === referencesVariable) continue;
            const offset = (theme.loc?.start.offset ?? 0) + match.index + match[0].indexOf(name);
            const preceding = context.sourceCode.text.slice(0, offset);
            const line = preceding.split("\n").length;
            const column = offset - preceding.lastIndexOf("\n");
            context.report({
              node: theme,
              loc: {
                start: { line, column },
                end: { line, column: column + name.length },
              },
              message: inline ? INLINE_MESSAGE : INDIRECT_MESSAGE,
            });
          }
        }

        // Scoped overrides are allowed only for the same-named variables
        // exposed by @theme inline, regardless of namespace.
        function checkTokenRedeclarations(currentNode: CssNodePlain, conditional = false): void {
          if (currentNode.type === "Atrule" && ["theme", "utility", "keyframes"].includes(currentNode.name)) {
            return;
          }
          const isConditional = conditional || (currentNode.type === "Atrule" && currentNode.name !== "layer");
          if (currentNode.type === "Rule") {
            const selector = context.sourceCode.getText(currentNode.prelude).trim();
            const isDefaultRoot = selector === ":root" && !isConditional;
            if (!isDefaultRoot) {
              for (const declaration of blockChildren(currentNode)) {
                if (declaration.type !== "Declaration") continue;
                if (mirroredTokens.has(declaration.property)) continue;
                if (!names.has(declaration.property) && !declaration.property.startsWith("--color-")) continue;
                context.report({
                  node: declaration,
                  message: `Tailwind token "${declaration.property}" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`,
                });
              }
            }
          }
          const children = currentNode.type === "StyleSheet" ? currentNode.children : blockChildren(currentNode);
          for (const child of children) {
            if (child.type === "Atrule" || child.type === "Rule") checkTokenRedeclarations(child, isConditional);
          }
        }
        checkTokenRedeclarations(node);

        for (const symbol of graph.definitions) {
          if (symbol.kind !== "root-variable" || symbol.scope !== "default") continue;
          if (symbol.file !== current || !names.has(symbol.name) || mirroredTokens.has(symbol.name)) continue;
          context.report({
            node,
            loc: {
              start: { line: symbol.line, column: 1 },
              end: { line: symbol.line, column: 2 },
            },
            message: `Token "${
              symbol.name
            }" is already defined in @theme; remove its duplicate default :root declaration.`,
          });
        }
      },
    };
  },
};
