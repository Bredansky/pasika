/**
 * ESLint rule: pasika/root-variables
 *
 * All tokens use @theme inline. Fixed values may compose theme tokens,
 * including variant-backed colors inside effects. Variant-driven tokens map
 * var(--same-name) to a :root default and an @variant override. External CSS
 * variables need literal fallbacks; direct token-to-token aliases are forbidden.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { parse, walk, type CssNode, type CssNodePlain, type StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { externalMapping } from "./external-mapping";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const INLINE_ONLY_MESSAGE = "Define all Tailwind theme tokens in @theme inline, including fixed values and resets.";
const INLINE_MAPPING_MESSAGE = (name: string): string =>
  `Tailwind token "${name}" must use a fixed value, same-named var(${name}), or an external var() with fallback in @theme inline.`;
const REDUNDANT_INLINE_MESSAGE = (name: string): string =>
  `Tailwind token "${name}" has no @variant override; define its fixed value directly in @theme inline.`;

/** Unwrap only provably neutral calc() operations, never arithmetic that changes a value. */
function noOpCalcAlias(value: string): string | undefined {
  if (!/^\s*calc\(/iu.test(value)) return undefined;
  const parsed = parse(value, { context: "value" });
  if (parsed.type !== "Value") return undefined;
  const topLevel = [...parsed.children];
  const outer = topLevel[0];
  if (topLevel.length !== 1 || outer?.type !== "Function" || outer.name.toLowerCase() !== "calc") {
    return undefined;
  }

  function aliasFrom(node: CssNode): string | undefined {
    if (node.type === "Value" || node.type === "Parentheses") {
      const children = [...node.children];
      return children.length === 1 && children[0] ? aliasFrom(children[0]) : undefined;
    }
    if (node.type !== "Function") return undefined;

    const children = [...node.children];
    if (node.name.toLowerCase() === "var") {
      const argument = children[0];
      return children.length === 1 && argument?.type === "Identifier" && /^--[a-z][\w-]*$/u.test(argument.name)
        ? argument.name
        : undefined;
    }
    if (node.name.toLowerCase() !== "calc") return undefined;
    if (children.length === 1 && children[0]) return aliasFrom(children[0]);
    if (children.length !== 3) return undefined;

    const [left, operator, right] = children;
    if (!left || operator?.type !== "Operator" || !right) return undefined;
    const isOne = (part: CssNode): boolean => part.type === "Number" && Number(part.value) === 1;
    if ((operator.value === "*" || operator.value === "/") && isOne(right)) return aliasFrom(left);
    if (operator.value === "*" && isOne(left)) return aliasFrom(right);
    return undefined;
  }

  return aliasFrom(outer);
}

export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require @theme inline for fixed tokens, variant-driven same-name mappings, and external variables with fallbacks.",
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
    const themeValues = new Map(
      graph.definitions
        .filter((symbol) => symbol.kind === "theme-token" && symbol.value !== undefined)
        .map((symbol) => [symbol.name, symbol.value ?? ""]),
    );
    const names = new Set(
      graph.definitions.filter((symbol) => symbol.kind === "theme-token").map((symbol) => symbol.name),
    );

    // Composite expressions can reuse existing theme tokens without becoming
    // direct aliases. Effects may also reference variant-backed and external-
    // provider colors; scalar/derived tokens still require fixed values.
    function isComposableThemeExpression(
      name: string,
      value: string,
      allowRuntimeReferences: boolean,
      visited = new Set([name]),
    ): boolean {
      if (externalMapping(value, name, authoredVariables)) return true;
      if (mirroredTokens.has(name) && new RegExp(`^\\s*var\\(\\s*${name}\\s*\\)\\s*$`, "u").test(value)) {
        return allowRuntimeReferences && defaultRootNames.has(name) && variantNames.has(name);
      }
      const references = [...value.matchAll(/\bvar\s*\(\s*(?<target>--[a-z][\w-]*)/giu)].map(
        (match) => match.groups?.target,
      );
      if (references.length === 0) return true;
      return references.every((target) => {
        if (!target || visited.has(target)) return false;
        const next = themeValues.get(target);
        if (!next) return false;
        return isComposableThemeExpression(target, next, allowRuntimeReferences, new Set([...visited, target]));
      });
    }
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
          if (inline && new RegExp(`^\\s*var\\(\\s*${name}\\s*\\)\\s*$`, "u").test(value ?? "")) {
            mirroredTokens.add(name);
          }
        }
      }
    }
    // A CSS variable declared by this project cannot be presented as an
    // external-provider mapping. Include scoped and conditional declarations.
    const authoredVariables = new Set(names);
    // Project-owned runtime tokens require an actual @variant override.
    // Scoped selectors, media queries, and setProperty do not qualify.
    const variantNames = new Set<string>();
    for (const file of [...stylesheets.filter((candidate) => path.normalize(candidate) !== current), current]) {
      const css = path.normalize(file) === current ? context.sourceCode.text : textOf(file);
      const tree = parse(css, { parseAtrulePrelude: false });
      let variantDepth = 0;
      walk(tree, {
        enter(node) {
          if (node.type === "Atrule" && node.name === "variant") variantDepth += 1;
          if (node.type !== "Declaration" || !node.property.startsWith("--")) return;
          authoredVariables.add(node.property);
          if (variantDepth > 0) variantNames.add(node.property);
        },
        leave(node) {
          if (node.type === "Atrule" && node.name === "variant") variantDepth -= 1;
        },
      });
    }

    const defaultRootNames = new Set(
      graph.definitions
        .filter((symbol) => symbol.kind === "root-variable" && symbol.scope === "default")
        .map((symbol) => symbol.name),
    );

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const localThemes = atrulesNamed(node, "theme");
        for (const theme of localThemes) {
          if (!preludeIdentifiers(theme).includes("inline")) {
            context.report({ node: theme, message: INLINE_ONLY_MESSAGE });
            continue;
          }
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
            const directReference = /^var\s*\(\s*(?<target>--[a-z][\w-]*)\s*\)$/u.exec(unquoted.trim())?.groups?.target;
            if (directReference) {
              if (directReference !== name) {
                context.report({
                  node: theme,
                  message: `Tailwind token "${name}" must reference its same-named CSS variable, not "${directReference}".`,
                });
              } else if (!defaultRootNames.has(name)) {
                context.report({
                  node: theme,
                  message: `Tailwind token "${name}" references "${name}" without a default :root declaration.`,
                });
              } else if (!variantNames.has(name)) {
                context.report({ node: theme, message: REDUNDANT_INLINE_MESSAGE(name) });
              }
              continue;
            }
            // A no-op calc() is still an alias, not a genuine composite expression.
            const noOpReference = noOpCalcAlias(unquoted);
            if (noOpReference) {
              context.report({
                node: theme,
                message:
                  noOpReference === name
                    ? INLINE_MAPPING_MESSAGE(name)
                    : `Tailwind token "${name}" must reference its same-named CSS variable, not "${noOpReference}".`,
              });
              continue;
            }
            if (externalMapping(value, name, authoredVariables)) continue;
            // A fallback cannot turn a project-owned token into an external mapping.
            const fallbackTarget = /^var\s*\(\s*(?<target>--[a-z][\w-]*)\s*,/u.exec(unquoted.trim())?.groups?.target;
            if (fallbackTarget && authoredVariables.has(fallbackTarget)) {
              context.report({ node: theme, message: INLINE_MAPPING_MESSAGE(name) });
              continue;
            }
            // Expressions may compose theme tokens, including runtime colors
            // in effects. A direct var(--other-token) remains a forbidden alias.
            const runtimeEffect = /^--(?:shadow|inset-shadow|drop-shadow|text-shadow|background-image)-/u.test(name);
            if (referencesVariable && !isComposableThemeExpression(name, unquoted, runtimeEffect)) {
              context.report({ node: theme, message: INLINE_MAPPING_MESSAGE(name) });
            }
          }
        }

        // Variant-driven runtime tokens may be overridden only in @variant.
        function checkTokenRedeclarations(currentNode: CssNodePlain, conditional = false, inVariant = false): void {
          if (currentNode.type === "Atrule" && ["theme", "utility", "keyframes"].includes(currentNode.name)) {
            return;
          }
          const isConditional = conditional || (currentNode.type === "Atrule" && currentNode.name !== "layer");
          const isVariant = inVariant || (currentNode.type === "Atrule" && currentNode.name === "variant");
          const isDefaultRoot =
            currentNode.type === "Rule" &&
            context.sourceCode.getText(currentNode.prelude).trim() === ":root" &&
            !isConditional;
          // A nested @variant can set CSS variables directly without another
          // selector. Check those declarations just like scoped selector overrides.
          if (
            (currentNode.type === "Rule" && !isDefaultRoot) ||
            (currentNode.type === "Atrule" && currentNode.name === "variant")
          ) {
            for (const declaration of blockChildren(currentNode)) {
              if (declaration.type !== "Declaration") continue;
              if (mirroredTokens.has(declaration.property) && (isVariant || !variantNames.has(declaration.property))) {
                continue;
              }
              if (!names.has(declaration.property) && !declaration.property.startsWith("--color-")) continue;
              context.report({
                node: declaration,
                message: `Tailwind token "${declaration.property}" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`,
              });
            }
          }
          const children = currentNode.type === "StyleSheet" ? currentNode.children : blockChildren(currentNode);
          for (const child of children) {
            if (child.type === "Atrule" || child.type === "Rule") {
              checkTokenRedeclarations(child, isConditional, isVariant);
            }
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
