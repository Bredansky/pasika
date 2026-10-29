/**
 * ESLint rule: pasika/utility-mapping
 *
 * A custom utility maps one Tailwind styling operation into the project's
 * Tailwind API. Reusable presentation belongs in components instead of
 * utilities that bundle multiple operations.
 *
 * A statically equivalent single-property mapping MUST use a generated
 * theme utility when supported by Tailwind. Configured typography equivalents
 * are also compared by emitted operations. Ambiguous CSS is excluded.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, themeClasses } from "./css-dependency-graph";
import { atrulesNamed, blockChildren, preludeIdentifiers, rawValue, rules } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

function applyOperationCount(utility: CssNodePlain): number {
  let count = 0;

  for (const apply of atrulesNamed(utility, "apply")) {
    const identifiers = preludeIdentifiers(apply);
    if (identifiers.length > 0) {
      count += identifiers.length;
      continue;
    }

    const prelude = "prelude" in apply ? apply.prelude : undefined;
    const raw = prelude ? rawValue(prelude) : "";
    const rawOperations = raw.trim().split(/\s+/).filter(Boolean);
    count += rawOperations.length > 0 ? rawOperations.length : 1;
  }

  return count;
}

interface ThemeCandidate {
  token: string;
  property: string;
  value: string;
  prefix: string;
  namespace: string;
}

/** Only one-property operations whose Tailwind-generated class is equivalent. */
const themeOperations = [
  { property: "font-size", prefix: "text", namespace: "text" },
  { property: "letter-spacing", prefix: "tracking", namespace: "tracking" },
  { property: "line-height", prefix: "leading", namespace: "leading" },
  { property: "font-family", prefix: "font", namespace: "font" },
  { property: "font-weight", prefix: "font", namespace: "font-weight" },
  { property: "tab-size", prefix: "tab", namespace: "tab-size" },
  { property: "border-radius", prefix: "rounded", namespace: "radius" },
  { property: "background-color", prefix: "bg", namespace: "color" },
  { property: "background-image", prefix: "bg", namespace: "background-image" },
  { property: "color", prefix: "text", namespace: "color" },
  { property: "border-color", prefix: "border", namespace: "color" },
  { property: "outline-color", prefix: "outline", namespace: "color" },
  { property: "fill", prefix: "fill", namespace: "color" },
  { property: "stroke", prefix: "stroke", namespace: "color" },
  { property: "caret-color", prefix: "caret", namespace: "color" },
  { property: "text-decoration-color", prefix: "decoration", namespace: "color" },
  { property: "padding", prefix: "p", namespace: "spacing" },
  { property: "padding-top", prefix: "pt", namespace: "spacing" },
  { property: "padding-right", prefix: "pr", namespace: "spacing" },
  { property: "padding-bottom", prefix: "pb", namespace: "spacing" },
  { property: "padding-left", prefix: "pl", namespace: "spacing" },
  { property: "margin", prefix: "m", namespace: "spacing" },
  { property: "margin-top", prefix: "mt", namespace: "spacing" },
  { property: "margin-right", prefix: "mr", namespace: "spacing" },
  { property: "margin-bottom", prefix: "mb", namespace: "spacing" },
  { property: "margin-left", prefix: "ml", namespace: "spacing" },
  { property: "gap", prefix: "gap", namespace: "spacing" },
  { property: "width", prefix: "w", namespace: "spacing" },
  { property: "height", prefix: "h", namespace: "spacing" },
  { property: "aspect-ratio", prefix: "aspect", namespace: "aspect" },
  { property: "transition-timing-function", prefix: "ease", namespace: "ease" },
  { property: "zoom", prefix: "zoom", namespace: "zoom" },
  { property: "perspective", prefix: "perspective", namespace: "perspective" },
  { property: "animation", prefix: "animate", namespace: "animate" },
] as const;

/** Multi-declaration generators (shadows, blur filters) need compiled-CSS equivalence, not a one-property guess. */

/**
 * Recognize one plain arbitrary-property or typed variable @apply,
 * without other declarations, modifiers or nested blocks. Ambiguous cases
 * remain custom utilities until their compiled CSS can be reviewed manually.
 */
function themeCandidate(name: string, utilityText: string): ThemeCandidate | undefined {
  const source = utilityText.trim();
  const arbitrary = /^@utility\s+[\w-]+\s*\{\s*@apply\s+\[(?<property>[a-z-]+):(?<value>[^\]\r\n;{}]+)\];?\s*\}$/u.exec(
    source,
  );
  const typed =
    /^@utility\s+[\w-]+\s*\{\s*@apply\s+(?<kind>[a-z]+)-\((?<hint>[a-z-]+:)?(?<variable>--[a-z][a-z0-9-]*)\);?\s*\}$/u.exec(
      source,
    );
  const direct = /^@utility\s+[\w-]+\s*\{\s*(?<property>[a-z-]+)\s*:\s*(?<value>[^;{}\r\n]+);?\s*\}$/u.exec(source);
  const property = arbitrary?.groups?.property ?? direct?.groups?.property;
  const matched = themeOperations.find((operation) => {
    if (property) return property === operation.property;
    if (!name.startsWith(`${operation.prefix}-`) || name.length <= operation.prefix.length + 1) return false;
    if (typed?.groups?.kind !== operation.prefix) return false;
    const hint = typed.groups.hint;
    if (operation.prefix === "text") return hint === (operation.property === "font-size" ? "length:" : "color:");
    if (operation.prefix === "font") {
      return hint === (operation.property === "font-family" ? "family-name:" : "number:");
    }
    return hint === undefined;
  });
  if (!matched) return undefined;

  const value =
    arbitrary?.groups?.value?.trim() ??
    direct?.groups?.value?.trim() ??
    (typed?.groups?.variable ? `var(${typed.groups.variable})` : undefined);
  if (!value) return undefined;
  // Do not approximate calc(), color-mix(), filter functions, composite values,
  // or underscore escapes; compiled CSS is required to prove equivalence.
  const simple = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vh|vw|ch|deg)?$/u.test(value);
  const variable = /^var\(--[a-z][a-z0-9-]*\)$/u.test(value);
  const color = /^#[\da-f]{3,8}$/iu.test(value);
  const keyword = /^[a-z][a-z-]*$/u.test(value);
  const ratio = /^\d+\/\d+$/u.test(value);
  if (!simple && !variable && !color && !keyword && !ratio) return undefined;
  if (matched.property === "font-size" && value.startsWith("-")) return undefined;

  const stem = name.startsWith(`${matched.prefix}-`) ? name.slice(matched.prefix.length + 1) : undefined;
  return {
    token: stem ? `--${matched.namespace}-${stem}` : "",
    property: matched.property,
    value,
    prefix: matched.prefix,
    namespace: matched.namespace,
  };
}
/** Names whose Tailwind classes are part of the common typography API. */
const builtInTextSizes = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
]);
const builtInTracking = new Set(["tighter", "tight", "normal", "wide", "wider", "widest"]);

interface ThemeDefinition {
  node: CssNodePlain;
  value: string;
}

/**
 * Accept only direct numeric CSS lengths; 14px != 0.875rem because the root
 * font size can vary. Ignore calc(), fallbacks, keywords, complex syntax, etc.
 */
function lengthIdentity(value: string): string | undefined {
  const match = /^(?<number>-?(?:\d+(?:\.\d*)?|\.\d+))(?<unit>px|rem|em|%)$/u.exec(value);
  const number = match?.groups?.number;
  const unit = match?.groups?.unit;
  if (!number || !unit) return undefined;
  return `${String(Number(number))}${unit}`;
}

function declarationValue(text: string): string | undefined {
  const match = /^--[\w-]+\s*:\s*(?<value>[^;{}]+);?$/u.exec(text.trim());
  return match?.groups?.value?.trim();
}

function canonicalToken(name: string): boolean {
  if (name.startsWith("--text-")) return builtInTextSizes.has(name.slice("--text-".length));
  if (name.startsWith("--tracking-")) return builtInTracking.has(name.slice("--tracking-".length));
  return false;
}

function isTypographySize(name: string): boolean {
  return /^--text-(?!.*--)(?:[a-z0-9]+-)*[a-z0-9]+$/u.test(name);
}

export const utilityMappingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require one styling operation per custom utility and enforce theme tokens instead of redundant mappings.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: findFiles(sourceRoot, CSS_EXTENSIONS).map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: [],
      includeReferences: false,
    });
    const projectTokens = graph.definitions.filter((symbol) => symbol.kind === "theme-token");
    const rootDefinitions = new Map<string, { value: string; scope: string }[]>();
    for (const symbol of graph.definitions) {
      if (symbol.kind !== "root-variable" || !symbol.value) continue;
      const values = rootDefinitions.get(symbol.name) ?? [];
      values.push({ value: symbol.value, scope: symbol.scope ?? "default" });
      rootDefinitions.set(symbol.name, values);
    }

    function comparableValue(value: string, visited = new Set<string>()): string | undefined {
      const text = value.trim();
      const match = /^var\((?<name>--[a-z][a-z0-9-]*)\)$/u.exec(text);
      const name = match?.groups?.name;
      if (!name) {
        const hex = /^#(?<digits>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(text)?.groups?.digits;
        if (!hex) return text;
        const lower = hex.toLowerCase();
        return lower.length <= 4 ? Array.from(lower, (digit) => digit + digit).join("") : lower;
      }
      if (visited.has(name)) return undefined;
      const values = rootDefinitions.get(name);
      if (!values) return text; // Same unresolved var() is still the same CSS operation.
      if (values.length !== 1 || values[0]?.scope !== "default") return undefined;
      const next = values[0].value;
      if (!next) return undefined;
      visited.add(name);
      return comparableValue(next, visited);
    }

    function equivalentValue(a: string, b: string): boolean {
      const left = comparableValue(a);
      const right = comparableValue(b);
      return left !== undefined && right !== undefined && left === right;
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const utilities = atrulesNamed(node, "utility");
        const themeTokens = new Set<string>();
        const nameCounts = new Map<string, number>();
        for (const theme of atrulesNamed(node, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type === "Declaration") themeTokens.add(child.property);
          }
        }
        for (const utility of utilities) {
          const name = preludeIdentifiers(utility)[0] ?? "";
          nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
        }

        // Theme-generated classes can be redundant too. Only compare
        // explicit tokens in this stylesheet, not presumed Tailwind defaults
        // (projects can reset the theme with "--*: initial").
        const themeDefinitions = new Map<string, ThemeDefinition[]>();
        for (const theme of atrulesNamed(node, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type !== "Declaration") continue;
            const value = declarationValue(context.sourceCode.getText(child));
            if (!value) continue;
            const definitions = themeDefinitions.get(child.property) ?? [];
            definitions.push({ node: child, value });
            themeDefinitions.set(child.property, definitions);
          }
        }

        // RuleTester supplies the current stylesheet in memory; include its
        // top-level roots even when it has not been written into the project graph.
        for (const cssRule of node.children) {
          if (cssRule.type !== "Rule") continue;
          if (context.sourceCode.getText(cssRule.prelude).trim() !== ":root") continue;
          for (const child of blockChildren(cssRule)) {
            if (child.type !== "Declaration" || !child.property.startsWith("--")) continue;
            if (rootDefinitions.has(child.property)) continue;
            const value = declarationValue(context.sourceCode.getText(child));
            if (value) rootDefinitions.set(child.property, [{ value, scope: "default" }]);
          }
        }

        // Resolve a single, unambiguous :root value only. Multiple
        // definitions (including overrides) are dynamic, not duplicates.
        const rootValues = new Map<string, string[]>();
        const overriddenVariables = new Set<string>();
        for (const cssRule of rules(node)) {
          if (!("prelude" in cssRule) || !cssRule.prelude) continue;
          const isRoot = context.sourceCode.getText(cssRule.prelude).trim() === ":root";
          for (const child of blockChildren(cssRule)) {
            if (child.type !== "Declaration" || !child.property.startsWith("--")) continue;
            if (!isRoot) {
              overriddenVariables.add(child.property);
              continue;
            }
            const value = declarationValue(context.sourceCode.getText(child));
            if (!value) continue;
            const definitions = rootValues.get(child.property) ?? [];
            definitions.push(value);
            rootValues.set(child.property, definitions);
          }
        }

        function identity(value: string): string | undefined {
          const variable = /^var\((?<name>--[a-z][a-z0-9-]*)\)$/u.exec(value);
          if (!variable) return lengthIdentity(value);
          const name = variable.groups?.name;
          if (!name || overriddenVariables.has(name)) return undefined;
          const definitions = rootValues.get(name);
          const definition = definitions?.length === 1 ? definitions[0] : undefined;
          return definition ? lengthIdentity(definition) : undefined;
        }

        for (const [name, definitions] of themeDefinitions) {
          const definition = definitions.length === 1 ? definitions[0] : undefined;
          if (!definition || canonicalToken(name)) continue;
          if (!isTypographySize(name) && !name.startsWith("--tracking-")) continue;
          if (name.includes("--", 2)) continue; // --text-sm--line-height, etc.
          const value = identity(definition.value);
          if (!value) continue;
          const prefix = name.startsWith("--text-") ? "--text-" : "--tracking-";
          for (const [other, otherDefinitions] of themeDefinitions) {
            const otherDefinition = otherDefinitions.length === 1 ? otherDefinitions[0] : undefined;
            if (!canonicalToken(other) || !other.startsWith(prefix) || !otherDefinition) continue;
            if (identity(otherDefinition.value) !== value) continue;
            // A configured text-* class can emit extra line-height,
            // letter-spacing, or font-weight declarations. Such a class
            // cannot replace a size-only class without semantic review.
            if (
              prefix === "--text-" &&
              ["--line-height", "--letter-spacing", "--font-weight"].some(
                (suffix) => themeDefinitions.has(`${name}${suffix}`) || themeDefinitions.has(`${other}${suffix}`),
              )
            ) {
              continue;
            }
            context.report({
              node: definition.node,
              message:
                `Theme token "${name}" duplicates the configured built-in "${other}" (${value}); ` +
                `reuse the "${other.slice(2)}" utility instead of defining an equivalent theme token.`,
            });
            break;
          }
        }

        function matchingThemeToken(candidate: ThemeCandidate): string | undefined {
          const namespacePrefix = `--${candidate.namespace}-`;
          const available = [
            ...projectTokens,
            ...[...themeDefinitions].flatMap(([name, definitions]) =>
              definitions.length === 1 && definitions[0] ? [{ name, value: definitions[0].value }] : [],
            ),
          ];
          for (const token of available) {
            if (!token.value || !token.name.startsWith(namespacePrefix) || token.name.includes("--", 2)) continue;
            if (!equivalentValue(candidate.value, token.value)) continue;
            // Typography tokens can emit additional declarations beyond font-size.
            if (
              candidate.namespace === "text" &&
              ["--line-height", "--letter-spacing", "--font-weight"].some(
                (suffix) =>
                  themeDefinitions.has(`${token.name}${suffix}`) ||
                  projectTokens.some((entry) => entry.name === `${token.name}${suffix}`),
              )
            ) {
              continue;
            }
            const generatedClass = `${candidate.prefix}-${token.name.slice(namespacePrefix.length)}`;
            if (candidate.namespace === "color" && !themeClasses(token.name).includes(generatedClass)) continue;
            return generatedClass;
          }
          return undefined;
        }

        for (const utility of utilities) {
          const name = preludeIdentifiers(utility)[0] ?? "unknown";
          const candidate = themeCandidate(name, context.sourceCode.getText(utility));
          const equivalent = candidate ? matchingThemeToken(candidate) : undefined;
          if (candidate && equivalent && nameCounts.get(name) === 1) {
            context.report({
              node: utility,
              message: `Custom utility "${name}" duplicates theme-generated "${equivalent}" (${candidate.property}: ${candidate.value}); reuse "${equivalent}" instead.`,
            });
            continue;
          }

          const operationCount = applyOperationCount(utility);
          if (operationCount !== 1) {
            context.report({
              node: utility,
              message:
                `Custom utility "${name}" maps ${String(operationCount)} Tailwind operations; ` +
                "custom utilities must map exactly one operation. Reusable presentation belongs in a component.",
            });
            continue;
          }
          if (nameCounts.get(name) !== 1 || !candidate?.token) continue;
          const tokenAlreadyDefined =
            themeTokens.has(candidate.token) || projectTokens.some((token) => token.name === candidate.token);
          if (tokenAlreadyDefined) continue; // A conflicting definition is not a safe replacement.
          if (candidate.property === "font-size" && themeTokens.has(`--color-${name.slice(5)}`)) continue;
          context.report({
            node: utility,
            message:
              `Custom utility "${name}" only maps ${candidate.property} (${candidate.value}); ` +
              `prefer @theme inline token "${candidate.token}" backed by a :root variable. ` +
              "Preserve the class name and compare compiled CSS before removing the utility.",
          });
        }

        // Theme classes take precedence over plain classes and @layer utility/component aliases.
        // Keep contextual selectors, conditional at-rules, and multi-operation bundles unchanged.
        function checkClass(cssNode: CssNodePlain): void {
          if (cssNode.type === "Atrule") {
            if (cssNode.name !== "layer" || !("prelude" in cssNode) || !cssNode.prelude) return;
            if (context.sourceCode.getText(cssNode.prelude).trim() === "base") return;
            for (const child of blockChildren(cssNode)) checkClass(child);
            return;
          }
          if (cssNode.type !== "Rule") return;
          const selector = context.sourceCode.getText(cssNode.prelude).trim();
          if (!/^\.[a-zA-Z_][\w-]*$/u.test(selector)) return;
          const children = blockChildren(cssNode);
          if (children.length !== 1) return;
          const only = children[0];
          if (!only) return;
          const declarationText = context.sourceCode.getText(only).trim();
          if (only.type === "Atrule" && only.name === "apply") {
            const alias = /^@apply\s+(?<name>[a-z][a-z0-9-]*)\s*;?$/u.exec(declarationText)?.groups?.name;
            if (
              alias &&
              [...projectTokens.map((token) => token.name), ...themeDefinitions.keys()].some((name) =>
                themeClasses(name).includes(alias),
              )
            ) {
              context.report({
                node: cssNode,
                message: `CSS class "${selector}" only aliases theme-generated "${alias}"; use "${alias}" instead.`,
              });
              return;
            }
          }
          const found =
            only.type === "Declaration"
              ? /^(?<property>[a-z-]+)\s*:\s*(?<value>[^;{}]+);?$/u.exec(declarationText)
              : /^@apply\s+\[(?<property>[a-z-]+):(?<value>[^\]\r\n;{}]+)\]\s*;?$/u.exec(declarationText);
          const property = found?.groups?.property;
          const value = found?.groups?.value?.trim();
          if (!property || !value || value.endsWith("!important")) return;
          const operation = themeOperations.find((item) => item.property === property);
          if (!operation) return;
          const candidate: ThemeCandidate = {
            token: "",
            property,
            value,
            prefix: operation.prefix,
            namespace: operation.namespace,
          };
          const equivalent = matchingThemeToken(candidate);
          if (!equivalent) return;
          context.report({
            node: cssNode,
            message: `CSS class "${selector}" duplicates theme-generated "${equivalent}" (${property}: ${value}); use "${equivalent}" instead.`,
          });
        }
        for (const cssRule of node.children) checkClass(cssRule);
      },
    };
  },
};
