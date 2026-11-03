/**
 * ESLint rule: pasika/root-variables
 *
 * Fixed values use plain @theme, without token-to-token aliases;
 * runtime values use @theme inline with a same-named var() mapping.
 * Same-named runtime token mappings require a default :root declaration under
 * Pasika's policy, with scoped or programmed overrides. This is a repository
 * convention for predictable defaults, not a CSS or Tailwind requirement.
 *
 * Tailwind emits @theme inside its lower-priority theme cascade layer.
 * Unlayered :root and scoped runtime declarations win over that layer, so an
 * intentional 1:1 @theme inline mapping is valid rather than a CSS var() cycle.
 * Without runtime overrides, however, the intermediate :root value is redundant:
 * the token's value belongs directly in @theme.
 * This convention applies to every Tailwind token namespace, not just colors.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate, parse, walk, type CssNodePlain, type StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const INLINE_MESSAGE = "Define design tokens with direct values in @theme, not @theme inline.";
const INDIRECT_MESSAGE = "Define design tokens that reference CSS variables via var() in @theme inline.";
const TOKEN_ALIAS_MESSAGE = (name: string): string =>
  `Tailwind token "${name}" must define its own fixed value in @theme, not alias another theme token.`;
const INLINE_MAPPING_MESSAGE = (name: string): string =>
  `Tailwind token "${name}" must use a direct var(${name}) mapping in @theme inline.`;
const MIXED_THEME_MESSAGE = "Use either @theme or @theme inline across the project.";
const REDUNDANT_INLINE_MESSAGE = (name: string): string =>
  `Tailwind token "${name}" has no runtime overrides; define its value directly in @theme instead of using :root and @theme inline.`;
export const rootVariablesRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require direct fixed @theme values, same-named runtime mappings in @theme inline, and no token aliases or redeclarations.",
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

    // Fixed @theme values may compose other fixed @theme tokens in expressions
    // such as hsl(var(--primary)) or multi-layer text shadows. Resolve every
    // reference transitively, rejecting runtime variables and token cycles.
    function isFixedThemeExpression(name: string, value: string, visited = new Set([name])): boolean {
      const references = [...value.matchAll(/\bvar\s*\(\s*(?<target>--[a-z][\w-]*)/giu)].map(
        (match) => match.groups?.target,
      );
      if (references.length === 0) return true;
      return references.every((target) => {
        if (!target || visited.has(target)) return false;
        const next = themeValues.get(target);
        if (!next) return false;
        return isFixedThemeExpression(target, next, new Set([...visited, target]));
      });
    }
    // Collect all theme names, including one-line blocks the tolerant parser
    // may truncate. Inline tokens backed by identically named variables may
    // be overridden at runtime regardless of their Tailwind namespace.
    const mirroredTokens = new Set<string>();
    let hasPlainThemeBlocks = false;
    let hasInlineThemeBlocks = false;
    for (const file of [...stylesheets.filter((candidate) => path.normalize(candidate) !== current), current]) {
      const source = (path.normalize(file) === current ? context.sourceCode.text : textOf(file)).replace(
        /\/\*[\s\S]*?\*\//gu,
        " ",
      );
      // A theme containing nested @keyframes cannot match the flat-body regex.
      // Detect each theme header independently before collecting declarations.
      for (const header of source.matchAll(/@theme(?<options>(?:\s+[\w-]+)*)\s*\{/gu)) {
        if (/\binline\b/u.test(header.groups?.options ?? "")) hasInlineThemeBlocks = true;
        else hasPlainThemeBlocks = true;
      }
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
    // Runtime overrides make 1:1 mappings meaningful. An ordinary default
    // :root is not an override; scoped selectors and conditional :root are.
    // Scan every stylesheet, since an override can live outside this file.
    const overriddenNames = new Set<string>(
      graph.definitions
        .filter((symbol) => symbol.kind === "root-variable" && symbol.scope === "conditional")
        .map((symbol) => symbol.name),
    );
    for (const file of [...stylesheets.filter((candidate) => path.normalize(candidate) !== current), current]) {
      const css = path.normalize(file) === current ? context.sourceCode.text : textOf(file);
      const tree = parse(css, { parseAtrulePrelude: false });
      walk(tree, {
        enter(node) {
          if (node.type !== "Declaration" || !node.property.startsWith("--")) return;
          if (this.rule?.type !== "Rule") return;
          if (generate(this.rule.prelude).trim() !== ":root") overriddenNames.add(node.property);
        },
      });
    }

    // CSS-in-JS may deliberately update an otherwise unscoped runtime variable.
    // Do not label an explicit setProperty target as a static-only token.
    for (const file of findFiles(sourceRoot, MODULE_EXTENSIONS)) {
      for (const found of textOf(file).matchAll(/\.setProperty\s*\(\s*["'\x60](?<name>--[\w-]+)["'\x60]/gu)) {
        if (found.groups?.name) overriddenNames.add(found.groups.name);
      }
    }

    const defaultRootNames = new Set(
      graph.definitions
        .filter((symbol) => symbol.kind === "root-variable" && symbol.scope === "default")
        .map((symbol) => symbol.name),
    );

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const localThemes = atrulesNamed(node, "theme");
        if (hasPlainThemeBlocks && hasInlineThemeBlocks && localThemes[0]) {
          context.report({ node: localThemes[0], message: MIXED_THEME_MESSAGE });
        }
        for (const theme of localThemes) {
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
            const directReference = /^var\s*\(\s*(?<target>--[a-z][\w-]*)\s*\)$/u.exec(unquoted.trim())?.groups?.target;
            if (inline && directReference) {
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
              } else if (!overriddenNames.has(name)) {
                context.report({ node: theme, message: REDUNDANT_INLINE_MESSAGE(name) });
              }
              continue;
            }
            // A fixed theme value can compose other fixed theme values (e.g.
            // a shadow or gradient); a direct alias is never a value of its own.
            if (!inline && directReference && isFixedThemeExpression(name, unquoted)) {
              context.report({ node: theme, message: TOKEN_ALIAS_MESSAGE(name) });
              continue;
            }
            if (inline && referencesVariable) {
              context.report({ node: theme, message: INLINE_MAPPING_MESSAGE(name) });
              continue;
            }
            if (!inline && (!referencesVariable || isFixedThemeExpression(name, unquoted))) continue;
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
              if (mirroredTokens.has(declaration.property)) continue;
              if (!names.has(declaration.property) && !declaration.property.startsWith("--color-")) continue;
              context.report({
                node: declaration,
                message: `Tailwind token "${declaration.property}" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`,
              });
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
